import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

import { CreateInventarioSucursalDto } from './dto/create-inventario-sucursal.dto';
import { UpdateInventarioSucursalDto } from './dto/update-inventario-sucursal.dto';
import { AjusteInventarioDto } from './dto/ajuste-inventario.dto';
import { TransferenciaInventarioDto } from './dto/transferencia-inventario.dto';
import { InventarioSucursalResponseDto } from './dto/inventario-sucursal-response.dto';
import { FilterInventarioSucursalDto } from './dto/filter-inventario-sucursal.dto';
import { DecimalUtil } from '../utils/decimal.util';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from 'generated/prisma/client';

@Injectable()
export class InventarioSucursalService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createInventarioSucursalDto: CreateInventarioSucursalDto): Promise<InventarioSucursalResponseDto> {
    const { productoId, sucursalId, tiendaId, ...inventarioData } = createInventarioSucursalDto;

    // Verificar que el producto existe
    const producto = await this.prisma.producto.findUnique({
      where: { id: productoId }
    });

    if (!producto) {
      throw new NotFoundException(`Producto con ID ${productoId} no encontrado`);
    }

    // Verificar que la sucursal existe
    const sucursal = await this.prisma.sucursal.findUnique({
      where: { id: sucursalId }
    });

    if (!sucursal) {
      throw new NotFoundException(`Sucursal con ID ${sucursalId} no encontrada`);
    }

    // Verificar que la tienda existe
    const tienda = await this.prisma.tienda.findUnique({
      where: { id: tiendaId }
    });

    if (!tienda) {
      throw new NotFoundException(`Tienda con ID ${tiendaId} no encontrada`);
    }

    // Verificar si ya existe el registro de inventario
    const existingInventario = await this.prisma.inventarioSucursal.findUnique({
      where: {
        productoId_sucursalId: {
          productoId,
          sucursalId
        }
      }
    });

    if (existingInventario) {
      throw new ConflictException('Ya existe un registro de inventario para este producto en la sucursal');
    }

    try {
      const inventario = await this.prisma.inventarioSucursal.create({
        data: {
          ...inventarioData,
          producto: { connect: { id: productoId } },
          sucursal: { connect: { id: sucursalId } },
          tienda: { connect: { id: tiendaId } }
        },
        include: {
          producto: {
            include: {
              categoria: true,
              imagenes: {
                take: 1,
                orderBy: { orden: 'asc' }
              }
            }
          },
          sucursal: true,
          tienda: true
        }
      });

      return new InventarioSucursalResponseDto(inventario);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Error al crear el inventario');
        }
      }
      throw error;
    }
  }

 async findAll(filterInventarioSucursalDto: FilterInventarioSucursalDto = {}): Promise<{ inventarios: InventarioSucursalResponseDto[], total: number }> {
    const {
      productoId,
      sucursalId,
      tiendaId,
      bajoStock,
      sinStock,
      page = 1,
      limit = 10
    } = filterInventarioSucursalDto;

    // VALIDACIÓN CRÍTICA: Asegurar que page y limit sean números válidos
    const pageNumber = isNaN(Number(page)) ? 1 : Math.max(1, Number(page));
    const limitNumber = isNaN(Number(limit)) ? 10 : Math.max(1, Math.min(Number(limit), 100));

    const where: Prisma.InventarioSucursalWhereInput = {};

    if (productoId) where.productoId = productoId;
    if (sucursalId) where.sucursalId = sucursalId;
    if (tiendaId) where.tiendaId = tiendaId;

    if (sinStock) {
      where.stock = { equals: 0 };
    } else if (bajoStock) {
      where.stock = { gt: 0 }; // Solo productos con stock
    }

    // Para bajoStock necesitamos un enfoque diferente
    if (bajoStock) {
      // Primero obtener todos los registros sin paginación
      const allInventarios = await this.prisma.inventarioSucursal.findMany({
        where: {
          ...where,
          stock: { gt: 0 } // Aseguramos stock positivo
        },
        include: {
          producto: {
            include: {
              categoria: true,
              subcategoria: true,
              imagenes: {
                take: 1,
                orderBy: { orden: 'asc' }
              }
            }
          },
          sucursal: {
            include: {
              tienda: true
            }
          },
          tienda: true
        },
        orderBy: { producto: { nombre: 'asc' } }
      });

      // Filtrar por stock bajo en la aplicación
      const inventariosBajoStock = allInventarios.filter(inv => 
        inv.stock <= (inv.stockMinimo || 5)
      );

      // Aplicar paginación manualmente
      const startIndex = (pageNumber - 1) * limitNumber;
      const endIndex = startIndex + limitNumber;
      const inventariosPaginados = inventariosBajoStock.slice(startIndex, endIndex);

      return {
        inventarios: inventariosPaginados.map(inv => new InventarioSucursalResponseDto(inv)),
        total: inventariosBajoStock.length
      };
    } else {
      // Consulta normal para otros casos
      const [inventarios, total] = await Promise.all([
        this.prisma.inventarioSucursal.findMany({
          where,
          include: {
            producto: {
              include: {
                categoria: true,
                subcategoria: true,
                imagenes: {
                  take: 1,
                  orderBy: { orden: 'asc' }
                }
              }
            },
            sucursal: {
              include: {
                tienda: true
              }
            },
            tienda: true
          },
          orderBy: { producto: { nombre: 'asc' } },
          skip: (pageNumber - 1) * limitNumber,
          take: limitNumber // Usar el número validado
        }),
        this.prisma.inventarioSucursal.count({ where })
      ]);

      return {
        inventarios: inventarios.map(inv => new InventarioSucursalResponseDto(inv)),
        total
      };
    }
  }
  async findOne(id: number): Promise<InventarioSucursalResponseDto> {
    const inventario = await this.prisma.inventarioSucursal.findUnique({
      where: { id },
      include: {
        producto: {
          include: {
            categoria: true,
            subcategoria: true,
            imagenes: true,
            proveedor: true
          }
        },
        sucursal: {
          include: {
            tienda: true
          }
        },
        tienda: true,
        movimientoInventario: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            usuario: {
              select: {
                id: true,
                nombre: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!inventario) {
      throw new NotFoundException(`Inventario con ID ${id} no encontrado`);
    }

    return new InventarioSucursalResponseDto(inventario);
  }

  async findByProductoAndSucursal(productoId: number, sucursalId: number): Promise<InventarioSucursalResponseDto> {
    const inventario = await this.prisma.inventarioSucursal.findUnique({
      where: {
        productoId_sucursalId: {
          productoId,
          sucursalId
        }
      },
      include: {
        producto: {
          include: {
            categoria: true,
            imagenes: {
              take: 1,
              orderBy: { orden: 'asc' }
            }
          }
        },
        sucursal: true,
        tienda: true
      }
    });

    if (!inventario) {
      throw new NotFoundException('No se encontró inventario para el producto en la sucursal especificada');
    }

    return new InventarioSucursalResponseDto(inventario);
  }

  async update(id: number, updateInventarioSucursalDto: UpdateInventarioSucursalDto): Promise<InventarioSucursalResponseDto> {
    const inventario = await this.findOne(id);

    const { productoId, sucursalId, tiendaId, ...inventarioData } = updateInventarioSucursalDto;

    try {
      const data: Prisma.InventarioSucursalUpdateInput = { ...inventarioData };

      if (productoId && productoId !== inventario.productoId) {
        const producto = await this.prisma.producto.findUnique({
          where: { id: productoId }
        });

        if (!producto) {
          throw new NotFoundException(`Producto con ID ${productoId} no encontrado`);
        }

        data.producto = { connect: { id: productoId } };
      }

      if (sucursalId && sucursalId !== inventario.sucursalId) {
        const sucursal = await this.prisma.sucursal.findUnique({
          where: { id: sucursalId }
        });

        if (!sucursal) {
          throw new NotFoundException(`Sucursal con ID ${sucursalId} no encontrada`);
        }

        data.sucursal = { connect: { id: sucursalId } };
      }

      if (tiendaId && tiendaId !== inventario.tiendaId) {
        const tienda = await this.prisma.tienda.findUnique({
          where: { id: tiendaId }
        });

        if (!tienda) {
          throw new NotFoundException(`Tienda con ID ${tiendaId} no encontrada`);
        }

        data.tienda = { connect: { id: tiendaId } };
      }

      const updatedInventario = await this.prisma.inventarioSucursal.update({
        where: { id },
        data,
        include: {
          producto: {
            include: {
              categoria: true,
              imagenes: {
                take: 1,
                orderBy: { orden: 'asc' }
              }
            }
          },
          sucursal: true,
          tienda: true
        }
      });

      return new InventarioSucursalResponseDto(updatedInventario);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Error al actualizar el inventario');
        }
      }
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    const inventario = await this.findOne(id);

    // Verificar si hay movimientos de inventario asociados
    const totalMovimientos = await this.prisma.movimientoInventario.count({
      where: { inventarioSucursalId: id }
    });

    if (totalMovimientos > 0) {
      throw new ConflictException('No se puede eliminar el inventario porque tiene movimientos asociados');
    }

    await this.prisma.inventarioSucursal.delete({
      where: { id }
    });
  }

  async ajustarStock(id: number, ajusteInventarioDto: AjusteInventarioDto, usuarioId?: number): Promise<InventarioSucursalResponseDto> {
    const inventario = await this.findOne(id);
    const { cantidad, motivo, observaciones } = ajusteInventarioDto;

    if (cantidad === 0) {
      throw new BadRequestException('La cantidad de ajuste no puede ser cero');
    }

    const nuevoStock = inventario.stock + cantidad;

    if (nuevoStock < 0) {
      throw new BadRequestException('No se puede ajustar el stock a un valor negativo');
    }

    try {
      return await this.prisma.$transaction(async (prisma) => {
        // Actualizar el stock
        const inventarioActualizado = await prisma.inventarioSucursal.update({
          where: { id },
          data: {
            stock: nuevoStock
          },
          include: {
            producto: {
              include: {
                categoria: true,
                imagenes: {
                  take: 1,
                  orderBy: { orden: 'asc' }
                }
              }
            },
            sucursal: true,
            tienda: true
          }
        });

        // Registrar el movimiento de inventario
        await prisma.movimientoInventario.create({
          data: {
            tipo: cantidad > 0 ? 'AJUSTE_SUCURSAL' : 'AJUSTE_SUCURSAL',
            cantidad: Math.abs(cantidad),
            productoId: inventario.productoId,
            motivo: `${motivo}: ${observaciones || 'Sin observaciones'}`,
            usuarioId: usuarioId,
            inventarioSucursalId: id,
            stockAnterior: inventario.stock,
            stockNuevo: nuevoStock
          }
        });

        return new InventarioSucursalResponseDto(inventarioActualizado);
      });
    } catch (error) {
      throw new ConflictException('Error al ajustar el stock');
    }
  }

  async transferirEntreSucursales(
    origenId: number, 
    destinoId: number, 
    cantidad: number, 
    motivo: string, 
    usuarioId?: number
  ): Promise<any> {
    if (origenId === destinoId) {
      throw new BadRequestException('No se puede transferir a la misma sucursal');
    }

    if (cantidad <= 0) {
      throw new BadRequestException('La cantidad de transferencia debe ser mayor a cero');
    }

    const [inventarioOrigen, inventarioDestino] = await Promise.all([
      this.findOne(origenId),
      this.findOne(destinoId)
    ]);

    if (inventarioOrigen.tiendaId !== inventarioDestino.tiendaId) {
      throw new BadRequestException('Solo se pueden transferir entre sucursales de la misma tienda');
    }

    if (inventarioOrigen.productoId !== inventarioDestino.productoId) {
      throw new BadRequestException('Solo se pueden transferir el mismo producto');
    }

    if (inventarioOrigen.stock < cantidad) {
      throw new BadRequestException('Stock insuficiente en el inventario de origen');
    }

    try {
      return await this.prisma.$transaction(async (prisma) => {
        // Restar stock del origen
        const origenActualizado = await prisma.inventarioSucursal.update({
          where: { id: origenId },
          data: {
            stock: { decrement: cantidad }
          }
        });

        // Sumar stock al destino
        const destinoActualizado = await prisma.inventarioSucursal.update({
          where: { id: destinoId },
          data: {
            stock: { increment: cantidad }
          }
        });

        // Registrar movimiento de salida
        await prisma.movimientoInventario.create({
          data: {
            tipo: 'TRANSFERENCIA_SALIDA',
            cantidad: cantidad,
            productoId: inventarioOrigen.productoId,
            motivo: `Transferencia a sucursal ${inventarioDestino.sucursal.nombre}: ${motivo}`,
            usuarioId: usuarioId,
            inventarioSucursalId: origenId,
            stockAnterior: inventarioOrigen.stock,
            stockNuevo: origenActualizado.stock
          }
        });

        // Registrar movimiento de entrada
        await prisma.movimientoInventario.create({
          data: {
            tipo: 'TRANSFERENCIA_ENTRADA',
            cantidad: cantidad,
            productoId: inventarioDestino.productoId,
            motivo: `Transferencia desde sucursal ${inventarioOrigen.sucursal.nombre}: ${motivo}`,
            usuarioId: usuarioId,
            inventarioSucursalId: destinoId,
            stockAnterior: inventarioDestino.stock,
            stockNuevo: destinoActualizado.stock
          }
        });

        return {
          message: 'Transferencia entre sucursales realizada exitosamente',
          origen: new InventarioSucursalResponseDto(origenActualizado),
          destino: new InventarioSucursalResponseDto(destinoActualizado),
          cantidad
        };
      });
    } catch (error) {
      throw new ConflictException('Error al transferir el stock entre sucursales');
    }
  }

  async getProductosBajoStock(sucursalId?: number, tiendaId?: number, stockMinimo?: number): Promise<{ inventarios: InventarioSucursalResponseDto[], total: number }> {
    const where: Prisma.InventarioSucursalWhereInput = {
      stock: { gt: 0 } // Solo productos con stock
    };

    if (sucursalId) where.sucursalId = sucursalId;
    if (tiendaId) where.tiendaId = tiendaId;

    const allInventarios = await this.prisma.inventarioSucursal.findMany({
      where,
      include: {
        producto: {
          include: {
            categoria: true,
            imagenes: {
              take: 1,
              orderBy: { orden: 'asc' }
            }
          }
        },
        sucursal: true,
        tienda: true
      }
    });

    // Filtrar en la aplicación
    const inventariosBajoStock = allInventarios.filter(inv => {
      const limite = stockMinimo !== undefined ? stockMinimo : (inv.stockMinimo || 5);
      return inv.stock <= limite;
    });

    return {
      inventarios: inventariosBajoStock.map(inv => new InventarioSucursalResponseDto(inv)),
      total: inventariosBajoStock.length
    };
  }

  async getProductosSinStock(sucursalId?: number, tiendaId?: number): Promise<{ inventarios: InventarioSucursalResponseDto[], total: number }> {
    const where: Prisma.InventarioSucursalWhereInput = {
      stock: { equals: 0 }
    };

    if (sucursalId) where.sucursalId = sucursalId;
    if (tiendaId) where.tiendaId = tiendaId;

    const [inventarios, total] = await Promise.all([
      this.prisma.inventarioSucursal.findMany({
        where,
        include: {
          producto: {
            include: {
              categoria: true,
              imagenes: {
                take: 1,
                orderBy: { orden: 'asc' }
              }
            }
          },
          sucursal: true,
          tienda: true
        },
        orderBy: { producto: { nombre: 'asc' } }
      }),
      this.prisma.inventarioSucursal.count({ where })
    ]);

    return {
      inventarios: inventarios.map(inv => new InventarioSucursalResponseDto(inv)),
      total
    };
  }

  async getEstadisticas(sucursalId?: number, tiendaId?: number): Promise<any> {
    const where: Prisma.InventarioSucursalWhereInput = {};
    
    if (sucursalId) where.sucursalId = sucursalId;
    if (tiendaId) where.tiendaId = tiendaId;

    const allInventarios = await this.prisma.inventarioSucursal.findMany({
      where,
      include: {
        producto: {
          select: {
            precio: true
          }
        }
      }
    });

    const totalProductos = allInventarios.length;
    const productosConStock = allInventarios.filter(inv => inv.stock > 0).length;
    const productosSinStock = allInventarios.filter(inv => inv.stock === 0).length;
    const productosBajoStock = allInventarios.filter(inv => 
      inv.stock > 0 && inv.stock <= (inv.stockMinimo || 5)
    ).length;

    const valorTotal = allInventarios.reduce((total, inv) => {
      const precio = DecimalUtil.toNumber(inv.producto.precio);
      return total + (precio * inv.stock);
    }, 0);

    return {
      totalProductos,
      productosConStock,
      productosSinStock,
      productosBajoStock,
      valorTotalInventario: valorTotal,
      porcentajeConStock: totalProductos > 0 ? (productosConStock / totalProductos) * 100 : 0,
      porcentajeBajoStock: totalProductos > 0 ? (productosBajoStock / totalProductos) * 100 : 0
    };
  }

  async getMovimientos(inventarioId: number, page: number = 1, limit: number = 10): Promise<any> {
    const inventario = await this.findOne(inventarioId);

    const [movimientos, total] = await Promise.all([
      this.prisma.movimientoInventario.findMany({
        where: { inventarioSucursalId: inventarioId },
        include: {
          usuario: {
            select: {
              id: true,
              nombre: true,
              email: true
            }
          },
          venta: {
            select: {
              id: true,
              numeroVenta: true
            }
          },
          transferencia: {
            select: {
              id: true,
              codigo: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      this.prisma.movimientoInventario.count({
        where: { inventarioSucursalId: inventarioId }
      })
    ]);

    return {
      inventario: new InventarioSucursalResponseDto(inventario),
      movimientos,
      total,
      page,
      limit
    };
  }

 async sincronizarConInventarioTienda(productoId: number, tiendaId: number): Promise<any> {
  // Obtener inventario de tienda principal
  const inventarioTienda = await this.prisma.inventarioTienda.findUnique({
    where: {
      productoId_tiendaId: {
        productoId,
        tiendaId
      }
    }
  });

  if (!inventarioTienda) {
    throw new NotFoundException('No se encontró inventario en la tienda principal');
  }

  // Obtener todas las sucursales de la tienda
  const sucursales = await this.prisma.sucursal.findMany({
    where: { tiendaId }
  });

  // Definir explícitamente el tipo del array
  const resultados: Array<{
    sucursal: string;
    inventario: InventarioSucursalResponseDto;
  }> = [];

  for (const sucursal of sucursales) {
    // Buscar o crear inventario en sucursal
    let inventarioSucursal = await this.prisma.inventarioSucursal.findUnique({
      where: {
        productoId_sucursalId: {
          productoId,
          sucursalId: sucursal.id
        }
      }
    });

    if (!inventarioSucursal) {
      inventarioSucursal = await this.prisma.inventarioSucursal.create({
        data: {
          productoId,
          sucursalId: sucursal.id,
          tiendaId,
          stock: 0,
          stockMinimo: inventarioTienda.stockMinimo
        }
      });
    }

    resultados.push({
      sucursal: sucursal.nombre,
      inventario: new InventarioSucursalResponseDto(inventarioSucursal)
    });
  }

  return {
    message: 'Sincronización completada',
    resultados
  };
}
}