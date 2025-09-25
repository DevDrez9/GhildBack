import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

import { CreateCarritoDto, CreateCarritoItemDto } from './dto/create-carrito.dto';
import { UpdateCarritoDto } from './dto/update-carrito.dto';
import { UpdateEstadoCarritoDto } from './dto/update-estado-carrito.dto';
import { CarritoResponseDto, CarritoItemResponseDto } from './dto/carrito-response.dto';
import { FilterCarritoDto } from './dto/filter-carrito.dto';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from 'generated/prisma/client';
import { Decimal } from 'generated/prisma/runtime/library';

@Injectable()
export class CarritoService {
  constructor(private readonly prisma: PrismaService) {}

  private async validarStockProductos(items: CreateCarritoItemDto[], tiendaId: number): Promise<void> {
    for (const item of items) {
      const producto = await this.prisma.producto.findUnique({
        where: { id: item.productoId },
        include: {
          inventarioTienda: {
            where: { tiendaId }
          }
        }
      });

      if (!producto) {
        throw new NotFoundException(`Producto con ID ${item.productoId} no encontrado`);
      }

      const stockDisponible = producto.inventarioTienda?.[0]?.stock || producto.stock;

      if (stockDisponible < item.cantidad) {
        throw new BadRequestException(
          `Stock insuficiente para el producto "${producto.nombre}". ` +
          `Solicitado: ${item.cantidad}, Disponible: ${stockDisponible}`
        );
      }
    }
  }


private async obtenerPrecioProducto(productoId: number): Promise<number> {
  const producto = await this.prisma.producto.findUnique({
    where: { id: productoId },
    select: {
      precio: true,
      precioOferta: true,
      enOferta: true
    }
  });

  if (!producto) {
    throw new NotFoundException(`Producto con ID ${productoId} no encontrado`);
  }

  // Convertir Decimal a number
  const precioNormal = producto.precio instanceof Decimal ? producto.precio.toNumber() : producto.precio;
  const precioOferta = producto.precioOferta instanceof Decimal ? producto.precioOferta.toNumber() : producto.precioOferta;

  return producto.enOferta && precioOferta ? precioOferta : precioNormal;
}
  async create(createCarritoDto: CreateCarritoDto): Promise<CarritoResponseDto> {
    const { items, tiendaId, ...carritoData } = createCarritoDto;

    // Verificar que la tienda existe
    const tienda = await this.prisma.tienda.findUnique({
      where: { id: tiendaId }
    });

    if (!tienda) {
      throw new NotFoundException(`Tienda con ID ${tiendaId} no encontrada`);
    }

    // Validar stock de productos
    await this.validarStockProductos(items, tiendaId);

    try {
      const carrito = await this.prisma.carrito.create({
        data: {
          ...carritoData,
          tiendaId,
          items: {
            create: await Promise.all(
              items.map(async (item) => {
                const precio = await this.obtenerPrecioProducto(item.productoId);
                return {
                  cantidad: item.cantidad,
                  productoId: item.productoId,
                  precio // Guardar el precio en el momento de la creación
                };
              })
            )
          }
        },
        include: {
          tienda: true,
          items: {
            include: {
              producto: {
                include: {
                  imagenes: {
                    take: 1,
                    orderBy: { orden: 'asc' }
                  },
                  categoria: true
                }
              }
            }
          }
        }
      });

      return new CarritoResponseDto(carrito);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Error al crear el carrito');
        }
      }
      throw error;
    }
  }

  async findAll(filterCarritoDto: FilterCarritoDto = {}): Promise<{ carritos: CarritoResponseDto[], total: number }> {
    const {
      estado,
      cliente,
      tiendaId,
      fechaInicio,
      fechaFin,
      page = 1,
      limit = 10
    } = filterCarritoDto;

    const where: Prisma.CarritoWhereInput = {};

    if (estado) where.estado = estado;
    if (tiendaId) where.tiendaId = tiendaId;
    if (cliente) where.cliente = { contains: cliente};

    if (fechaInicio || fechaFin) {
      where.createdAt = {};
      if (fechaInicio) where.createdAt.gte = new Date(fechaInicio);
      if (fechaFin) {
        const fechaFinDate = new Date(fechaFin);
        fechaFinDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = fechaFinDate;
      }
    }

    const [carritos, total] = await Promise.all([
      this.prisma.carrito.findMany({
        where,
        include: {
          tienda: true,
          items: {
            include: {
              producto: {
                include: {
                  imagenes: {
                    take: 1,
                    orderBy: { orden: 'asc' }
                  },
                  categoria: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      this.prisma.carrito.count({ where })
    ]);

    return {
      carritos: carritos.map(carrito => new CarritoResponseDto(carrito)),
      total
    };
  }

  async findOne(id: number): Promise<CarritoResponseDto> {
    const carrito = await this.prisma.carrito.findUnique({
      where: { id },
      include: {
        tienda: {
          include: {
            configWeb: true
          }
        },
        items: {
          include: {
            producto: {
              include: {
                imagenes: true,
                categoria: true,
                subcategoria: true
              }
            }
          }
        }
      }
    });

    if (!carrito) {
      throw new NotFoundException(`Carrito con ID ${id} no encontrado`);
    }

    return new CarritoResponseDto(carrito);
  }

  async findByCliente(cliente: string, tiendaId?: number): Promise<CarritoResponseDto[]> {
    const where: Prisma.CarritoWhereInput = {
      cliente: { contains: cliente },
      estado: 'pendiente'
    };

    if (tiendaId) {
      where.tiendaId = tiendaId;
    }

    const carritos = await this.prisma.carrito.findMany({
      where,
      include: {
        tienda: true,
        items: {
          include: {
            producto: {
              include: {
                imagenes: {
                  take: 1,
                  orderBy: { orden: 'asc' }
                },
                categoria: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return carritos.map(carrito => new CarritoResponseDto(carrito));
  }

  async update(id: number, updateCarritoDto: UpdateCarritoDto): Promise<CarritoResponseDto> {
    const carrito = await this.findOne(id);

    // Solo permitir actualizar carritos en estado pendiente
    if (carrito.estado !== 'pendiente') {
      throw new BadRequestException('Solo se pueden modificar carritos en estado pendiente');
    }

    const { items, ...carritoData } = updateCarritoDto;

    try {
      const data: Prisma.CarritoUpdateInput = { ...carritoData };

      if (items) {
        // Validar stock primero
        await this.validarStockProductos(items, carrito.tiendaId);

        // Eliminar items existentes
        await this.prisma.carritoItem.deleteMany({
          where: { carritoId: id }
        });

        // Crear nuevos items
        data.items = {
          create: await Promise.all(
            items.map(async (item) => {
              const precio = await this.obtenerPrecioProducto(item.productoId);
              return {
                cantidad: item.cantidad,
                productoId: item.productoId,
                precio
              };
            })
          )
        };
      }

      const updatedCarrito = await this.prisma.carrito.update({
        where: { id },
        data,
        include: {
          tienda: true,
          items: {
            include: {
              producto: {
                include: {
                  imagenes: {
                    take: 1,
                    orderBy: { orden: 'asc' }
                  },
                  categoria: true
                }
              }
            }
          }
        }
      });

      return new CarritoResponseDto(updatedCarrito);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Error al actualizar el carrito');
        }
      }
      throw error;
    }
  }

  async updateEstado(id: number, updateEstadoCarritoDto: UpdateEstadoCarritoDto): Promise<CarritoResponseDto> {
    const carrito = await this.findOne(id);

    const updatedCarrito = await this.prisma.carrito.update({
      where: { id },
      data: {
        estado: updateEstadoCarritoDto.estado
      },
      include: {
        tienda: true,
        items: {
          include: {
            producto: {
              include: {
                imagenes: {
                  take: 1,
                  orderBy: { orden: 'asc' }
                },
                categoria: true
              }
            }
          }
        }
      }
    });

    return new CarritoResponseDto(updatedCarrito);
  }

  async addItem(carritoId: number, createItemDto: CreateCarritoItemDto): Promise<CarritoResponseDto> {
    const carrito = await this.findOne(carritoId);

    if (carrito.estado !== 'pendiente') {
      throw new BadRequestException('Solo se pueden agregar items a carritos en estado pendiente');
    }

    // Validar stock
    await this.validarStockProductos([createItemDto], carrito.tiendaId);

    const precio = await this.obtenerPrecioProducto(createItemDto.productoId);

    await this.prisma.carritoItem.create({
      data: {
        cantidad: createItemDto.cantidad,
        precio,
        productoId: createItemDto.productoId,
        carritoId
      }
    });

    return this.findOne(carritoId);
  }

  async updateItem(itemId: number, cantidad: number): Promise<CarritoResponseDto> {
    const item = await this.prisma.carritoItem.findUnique({
      where: { id: itemId },
      include: {
        carrito: true,
        producto: true
      }
    });

    if (!item) {
      throw new NotFoundException(`Item de carrito con ID ${itemId} no encontrado`);
    }

    if (item.carrito.estado !== 'pendiente') {
      throw new BadRequestException('Solo se pueden modificar items en carritos pendientes');
    }

    // Validar stock
    if (cantidad > item.cantidad) {
      const stockNecesario = cantidad - item.cantidad;
      await this.validarStockProductos(
        [{ productoId: item.productoId, cantidad: stockNecesario }],
        item.carrito.tiendaId
      );
    }

    await this.prisma.carritoItem.update({
      where: { id: itemId },
      data: { cantidad }
    });

    return this.findOne(item.carritoId);
  }

  async removeItem(itemId: number): Promise<CarritoResponseDto> {
    const item = await this.prisma.carritoItem.findUnique({
      where: { id: itemId },
      include: {
        carrito: true
      }
    });

    if (!item) {
      throw new NotFoundException(`Item de carrito con ID ${itemId} no encontrado`);
    }

    if (item.carrito.estado !== 'pendiente') {
      throw new BadRequestException('Solo se pueden eliminar items de carritos pendientes');
    }

    await this.prisma.carritoItem.delete({
      where: { id: itemId }
    });

    return this.findOne(item.carritoId);
  }

  async remove(id: number): Promise<void> {
    const carrito = await this.findOne(id);

    // Solo permitir eliminar carritos en estado pendiente
    if (carrito.estado !== 'pendiente') {
      throw new BadRequestException('Solo se pueden eliminar carritos en estado pendiente');
    }

    await this.prisma.carrito.delete({
      where: { id }
    });
  }

  async convertToVenta(carritoId: number): Promise<any> {
    const carrito = await this.findOne(carritoId);

    if (carrito.estado !== 'pendiente') {
      throw new BadRequestException('Solo se pueden convertir a venta carritos en estado pendiente');
    }

    // Aquí integrarías con el servicio de ventas
    // Esta es una implementación básica
    const ventaData = {
      cliente: carrito.cliente,
      telefono: carrito.telefono,
      direccion: carrito.direccion,
      estado: 'PENDIENTE' as const,
      total: carrito.total,
      subtotal: carrito.total,
      tiendaId: carrito.tiendaId,
      items: carrito.items.map(item => ({
        productoId: item.productoId,
        cantidad: item.cantidad,
        precio: item.producto.precioOferta || item.producto.precio
      }))
    };

    // Marcar carrito como completado
    await this.prisma.carrito.update({
      where: { id: carritoId },
      data: { estado: 'completado' }
    });

    return {
      message: 'Carrito convertido a venta exitosamente',
      carritoId,
      total: carrito.total,
      itemsCount: carrito.items.length
    };
  }

  async getEstadisticas(tiendaId?: number): Promise<any> {
    const where: Prisma.CarritoWhereInput = {};
    
    if (tiendaId) where.tiendaId = tiendaId;

    const [
      totalCarritos,
      carritosPendientes,
      carritosCompletados,
      carritosCancelados,
      carritosPorEstado
    ] = await Promise.all([
      this.prisma.carrito.count({ where }),
      this.prisma.carrito.count({
        where: { ...where, estado: 'pendiente' }
      }),
      this.prisma.carrito.count({
        where: { ...where, estado: 'completado' }
      }),
      this.prisma.carrito.count({
        where: { ...where, estado: 'cancelado' }
      }),
      this.prisma.carrito.groupBy({
        by: ['estado'],
        where,
        _count: { _all: true }
      })
    ]);

    return {
      totalCarritos,
      carritosPendientes,
      carritosCompletados,
      carritosCancelados,
      carritosPorEstado
    };
  }
}