import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

import { CreateInventarioTiendaDto } from './dto/create-inventario-tienda.dto';
import { UpdateInventarioTiendaDto } from './dto/update-inventario-tienda.dto';
import { AjusteInventarioDto } from './dto/ajuste-inventario.dto';
import { InventarioTiendaResponseDto } from './dto/inventario-tienda-response.dto';
import { FilterInventarioTiendaDto } from './dto/filter-inventario-tienda.dto';
import { DecimalUtil } from '../utils/decimal.util';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from 'generated/prisma/client';
import { InventarioSucursalResponseDto } from 'src/inventario-sucursal/dto/inventario-sucursal-response.dto';

@Injectable()
export class InventarioTiendaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createInventarioTiendaDto: CreateInventarioTiendaDto): Promise<InventarioTiendaResponseDto> {
    const { productoId, tiendaId, ...inventarioData } = createInventarioTiendaDto;

    // Verificar que el producto existe
    const producto = await this.prisma.producto.findUnique({
      where: { id: productoId }
    });

    if (!producto) {
      throw new NotFoundException(`Producto con ID ${productoId} no encontrado`);
    }

    // Verificar que la tienda existe
    const tienda = await this.prisma.tienda.findUnique({
      where: { id: tiendaId }
    });

    if (!tienda) {
      throw new NotFoundException(`Tienda con ID ${tiendaId} no encontrada`);
    }

    // Verificar si ya existe el registro de inventario
    const existingInventario = await this.prisma.inventarioTienda.findUnique({
      where: {
        productoId_tiendaId: {
          productoId,
          tiendaId
        }
      }
    });

    if (existingInventario) {
      throw new ConflictException('Ya existe un registro de inventario para este producto en la tienda');
    }

    try {
      const inventario = await this.prisma.inventarioTienda.create({
        data: {
          ...inventarioData,
          producto: { connect: { id: productoId } },
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
          tienda: true
        }
      });

      return new InventarioTiendaResponseDto(inventario);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Error al crear el inventario');
        }
      }
      throw error;
    }
  }

async findAll(filterInventarioTiendaDto: FilterInventarioTiendaDto = {}): Promise<{ inventarios: InventarioTiendaResponseDto[], total: number }> {
    const {
      productoId,
      tiendaId,
      bajoStock,
      sinStock,
      page = 1,
      limit = 10
    } = filterInventarioTiendaDto;

    // Validar parámetros numéricos
    const pageNumber = Math.max(1, parseInt(page as any) || 1);
    const limitNumber = Math.max(1, Math.min(parseInt(limit as any) || 10, 100));

    const baseWhere: Prisma.InventarioTiendaWhereInput = {};

    if (productoId) baseWhere.productoId = productoId;
    if (tiendaId) baseWhere.tiendaId = tiendaId;

    if (sinStock) {
      baseWhere.stock = { equals: 0 };
    } else if (bajoStock) {
      baseWhere.stock = { gt: 0 };
    }

    if (bajoStock) {
      // Para bajoStock, necesitamos hacer una consulta diferente
      const [inventarios, totalCount] = await Promise.all([
        this.prisma.inventarioTienda.findMany({
          where: baseWhere,
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
            tienda: true
          },
          orderBy: { producto: { nombre: 'asc' } }
        }),
        this.prisma.inventarioTienda.count({ where: baseWhere })
      ]);

      // Filtrar por stock bajo y aplicar paginación en memoria
      const inventariosBajoStock = inventarios.filter(inv => 
        inv.stock <= (inv.stockMinimo || 5)
      );

      // Aplicar paginación manualmente
      const startIndex = (pageNumber - 1) * limitNumber;
      const endIndex = startIndex + limitNumber;
      const inventariosPaginados = inventariosBajoStock.slice(startIndex, endIndex);

      return {
        inventarios: inventariosPaginados.map(inv => new InventarioTiendaResponseDto(inv)),
        total: inventariosBajoStock.length
      };
    } else {
      // Consulta normal para otros casos
      const [inventarios, total] = await Promise.all([
        this.prisma.inventarioTienda.findMany({
          where: baseWhere,
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
            tienda: true
          },
          orderBy: { producto: { nombre: 'asc' } },
          skip: (pageNumber - 1) * limitNumber,
          take: limitNumber
        }),
        this.prisma.inventarioTienda.count({ where: baseWhere })
      ]);

      return {
        inventarios: inventarios.map(inv => new InventarioTiendaResponseDto(inv)),
        total
      };
    }
  }
  async findOne(id: number): Promise<InventarioTiendaResponseDto> {
    const inventario = await this.prisma.inventarioTienda.findUnique({
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
        tienda: {
          include: {
            configWeb: true
          }
        },
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

    return new InventarioTiendaResponseDto(inventario);
  }

  async findByProductoAndTienda(productoId: number, tiendaId: number): Promise<InventarioTiendaResponseDto> {
    const inventario = await this.prisma.inventarioTienda.findUnique({
      where: {
        productoId_tiendaId: {
          productoId,
          tiendaId
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
        tienda: true
      }
    });

    if (!inventario) {
      throw new NotFoundException('No se encontró inventario para el producto en la tienda especificada');
    }

    return new InventarioTiendaResponseDto(inventario);
  }

  async update(id: number, updateInventarioTiendaDto: UpdateInventarioTiendaDto): Promise<InventarioTiendaResponseDto> {
    const inventario = await this.findOne(id);

    const { productoId, tiendaId, ...inventarioData } = updateInventarioTiendaDto;

    try {
      const data: Prisma.InventarioTiendaUpdateInput = { ...inventarioData };

      if (productoId && productoId !== inventario.productoId) {
        // Verificar que el nuevo producto existe
        const producto = await this.prisma.producto.findUnique({
          where: { id: productoId }
        });

        if (!producto) {
          throw new NotFoundException(`Producto con ID ${productoId} no encontrado`);
        }

        data.producto = { connect: { id: productoId } };
      }

      if (tiendaId && tiendaId !== inventario.tiendaId) {
        // Verificar que la nueva tienda existe
        const tienda = await this.prisma.tienda.findUnique({
          where: { id: tiendaId }
        });

        if (!tienda) {
          throw new NotFoundException(`Tienda con ID ${tiendaId} no encontrada`);
        }

        data.tienda = { connect: { id: tiendaId } };
      }

      const updatedInventario = await this.prisma.inventarioTienda.update({
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
          tienda: true
        }
      });

      return new InventarioTiendaResponseDto(updatedInventario);
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
      where: { inventarioTiendaId: id }
    });

    if (totalMovimientos > 0) {
      throw new ConflictException('No se puede eliminar el inventario porque tiene movimientos asociados');
    }

    await this.prisma.inventarioTienda.delete({
      where: { id }
    });
  }

  async ajustarStock(id: number, ajusteInventarioDto: AjusteInventarioDto, usuarioId?: number): Promise<InventarioTiendaResponseDto> {
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
        const inventarioActualizado = await prisma.inventarioTienda.update({
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
            tienda: true
          }
        });

        // Registrar el movimiento de inventario
        await prisma.movimientoInventario.create({
          data: {
            tipo: cantidad > 0 ? 'AJUSTE_FABRICA' : 'AJUSTE_FABRICA',
            cantidad: Math.abs(cantidad),
            productoId: inventario.productoId,
            motivo: `${motivo}: ${observaciones || 'Sin observaciones'}`,
            usuarioId: usuarioId,
            inventarioTiendaId: id,
            stockAnterior: inventario.stock,
            stockNuevo: nuevoStock
          }
        });

        return new InventarioTiendaResponseDto(inventarioActualizado);
      });
    } catch (error) {
      throw new ConflictException('Error al ajustar el stock');
    }
  }

  async transferirStock(
    origenId: number, 
    destinoId: number, 
    cantidad: number, 
    motivo: string, 
    usuarioId?: number
  ): Promise<any> {
    if (origenId === destinoId) {
      throw new BadRequestException('No se puede transferir al mismo inventario');
    }

    if (cantidad <= 0) {
      throw new BadRequestException('La cantidad de transferencia debe ser mayor a cero');
    }

    const [inventarioOrigen, inventarioDestino] = await Promise.all([
      this.findOne(origenId),
      this.findOne(destinoId)
    ]);

    if (inventarioOrigen.tiendaId !== inventarioDestino.tiendaId) {
      throw new BadRequestException('Solo se pueden transferir entre inventarios de la misma tienda');
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
        const origenActualizado = await prisma.inventarioTienda.update({
          where: { id: origenId },
          data: {
            stock: { decrement: cantidad }
          }
        });

        // Sumar stock al destino
        const destinoActualizado = await prisma.inventarioTienda.update({
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
            motivo: `Transferencia a inventario #${destinoId}: ${motivo}`,
            usuarioId: usuarioId,
            inventarioTiendaId: origenId,
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
            motivo: `Transferencia desde inventario #${origenId}: ${motivo}`,
            usuarioId: usuarioId,
            inventarioTiendaId: destinoId,
            stockAnterior: inventarioDestino.stock,
            stockNuevo: destinoActualizado.stock
          }
        });

        return {
          message: 'Transferencia realizada exitosamente',
          origen: new InventarioTiendaResponseDto(origenActualizado),
          destino: new InventarioTiendaResponseDto(destinoActualizado),
          cantidad
        };
      });
    } catch (error) {
      throw new ConflictException('Error al transferir el stock');
    }
  }

async transferirStockSucursal(
    origenId: number, // ID del InventarioTienda (Origen)
    destinoId: number, // ID del InventarioSucursal (Destino)
    cantidad: number,
    motivo: string,
    usuarioId?: number
): Promise<any> {
    
    // --- Validaciones Iniciales ---
    if (cantidad <= 0) {
        throw new BadRequestException('La cantidad de transferencia debe ser mayor a cero');
    }
    
    // Al ser transferencias Tienda -> Sucursal, no es necesario validar origenId === destinoId

    // --- Obtener Inventarios ---
    const [inventarioOrigen, inventarioDestino] = await Promise.all([
        // Origen (Siempre Tienda): Asumo que this.findOne busca en InventarioTienda
        this.findOne(origenId), 
        // Destino (Siempre Sucursal): Necesitas un método que busque en InventarioSucursal
        this.findOneSucursal(destinoId) 
    ]);
    
    // --- Validaciones de Inventario ---

    // 1. Validar que el producto sea el mismo
    if (inventarioOrigen.productoId !== inventarioDestino.productoId) {
        throw new BadRequestException('Solo se pueden transferir el mismo producto');
    }

    // 2. Validar stock suficiente en el origen (Tienda)
    if (inventarioOrigen.stock < cantidad) {
        throw new BadRequestException('Stock insuficiente en el inventario de origen (Tienda)');
    }
    
    // No se requiere validación de 'misma tienda' ya que es Tienda a Sucursal.

    // --- Transacción de Stock ---
    try {
        return await this.prisma.$transaction(async (prisma) => {
            
            // 1. Restar stock del origen (InventarioTienda)
            const origenActualizado = await prisma.inventarioTienda.update({
                where: { id: origenId },
                data: {
                    stock: { decrement: cantidad }
                }
            });

            // 2. Sumar stock al destino (InventarioSucursal) <-- CAMBIO CRUCIAL
            const destinoActualizado = await prisma.inventarioSucursal.update({ 
                where: { id: destinoId },
                data: {
                    stock: { increment: cantidad }
                }
            });

            // 3. Registrar movimiento de salida (Desde InventarioTienda)
            await prisma.movimientoInventario.create({
                data: {
                    tipo: 'TRANSFERENCIA_SALIDA',
                    cantidad: cantidad,
                    productoId: inventarioOrigen.productoId,
                    motivo: `Transferencia a Sucursal #${destinoId}: ${motivo}`,
                    usuarioId: usuarioId,
                    inventarioTiendaId: origenId, // Referencia al origen (Tienda)
                    stockAnterior: inventarioOrigen.stock,
                    stockNuevo: origenActualizado.stock
                }
            });

            // 4. Registrar movimiento de entrada (A InventarioSucursal) <-- CAMBIO CRUCIAL
            await prisma.movimientoInventario.create({
                data: {
                    tipo: 'TRANSFERENCIA_ENTRADA',
                    cantidad: cantidad,
                    productoId: inventarioDestino.productoId,
                    motivo: `Transferencia desde Tienda #${origenId}: ${motivo}`,
                    usuarioId: usuarioId,
                    inventarioSucursalId: destinoId, // Referencia al destino (Sucursal)
                    // inventarioTiendaId: null, // Si es un campo requerido, establece null explícitamente si tu esquema lo permite
                    stockAnterior: inventarioDestino.stock,
                    stockNuevo: destinoActualizado.stock
                }
            });

            return {
                message: 'Transferencia Tienda a Sucursal realizada exitosamente',
                origen: new InventarioTiendaResponseDto(origenActualizado),
                destino: destinoActualizado, // Usar el DTO de Sucursal si lo tienes
                cantidad
            };
        });
    } catch (error) {
        console.error(error); 
        throw new ConflictException('Error al transferir el stock');
    }
}

 async getProductosBajoStock(tiendaId?: number, stockMinimo?: number): Promise<{ inventarios: InventarioTiendaResponseDto[], total: number }> {
    const where: Prisma.InventarioTiendaWhereInput = {
      stock: { gt: 0 } // Solo productos con stock
    };

    if (tiendaId) {
      where.tiendaId = tiendaId;
    }

    const allInventarios = await this.prisma.inventarioTienda.findMany({
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
        tienda: true
      }
    });

    // Filtrar en la aplicación en lugar de en la base de datos
    const inventariosBajoStock = allInventarios.filter(inv => {
      const limite = stockMinimo !== undefined ? stockMinimo : (inv.stockMinimo || 5);
      return inv.stock <= limite;
    });

    return {
      inventarios: inventariosBajoStock.map(inv => new InventarioTiendaResponseDto(inv)),
      total: inventariosBajoStock.length
    };
  }
async getProductosSinStock(tiendaId?: number): Promise<{ inventarios: InventarioTiendaResponseDto[], total: number }> {
    const where: Prisma.InventarioTiendaWhereInput = {
      stock: { equals: 0 }
    };

    if (tiendaId) {
      where.tiendaId = tiendaId;
    }

    const [inventarios, total] = await Promise.all([
      this.prisma.inventarioTienda.findMany({
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
          tienda: true
        },
        orderBy: { producto: { nombre: 'asc' } }
      }),
      this.prisma.inventarioTienda.count({ where })
    ]);

    return {
      inventarios: inventarios.map(inv => new InventarioTiendaResponseDto(inv)),
      total
    };
  }
async getEstadisticas(tiendaId?: number): Promise<any> {
    const where: Prisma.InventarioTiendaWhereInput = {};
    
    if (tiendaId) where.tiendaId = tiendaId;

    const allInventarios = await this.prisma.inventarioTienda.findMany({
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
        where: { inventarioTiendaId: inventarioId },
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
          compra: {
            select: {
              id: true,
              numeroCompra: true
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
        where: { inventarioTiendaId: inventarioId }
      })
    ]);

    return {
      inventario: new InventarioTiendaResponseDto(inventario),
      movimientos,
      total,
      page,
      limit
    };
  }

  
    async findOneSucursal(id: number): Promise<InventarioSucursalResponseDto> {
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
}