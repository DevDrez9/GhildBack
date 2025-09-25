import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

import { CreateSucursalDto } from './dto/create-sucursal.dto';
import { UpdateSucursalDto } from './dto/update-sucursal.dto';
import { SucursalResponseDto } from './dto/sucursal-response.dto';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from 'generated/prisma/client';

@Injectable()
export class SucursalService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSucursalDto: CreateSucursalDto): Promise<SucursalResponseDto> {
    const { tiendaId, ...sucursalData } = createSucursalDto;

    // Verificar que la tienda existe
    const tienda = await this.prisma.tienda.findUnique({
      where: { id: tiendaId }
    });

    if (!tienda) {
      throw new NotFoundException(`Tienda con ID ${tiendaId} no encontrada`);
    }

    try {
      const sucursal = await this.prisma.sucursal.create({
        data: {
          ...sucursalData,
          tienda: {
            connect: { id: tiendaId }
          }
        },
        include: {
          tienda: true,
          inventario: true,
          ventas: true
        }
      });

      return new SucursalResponseDto(sucursal);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          // Puedes agregar validaciones específicas si es necesario
          throw new ConflictException('Error al crear la sucursal');
        }
      }
      throw error;
    }
  }

  async findAll(): Promise<SucursalResponseDto[]> {
    const sucursales = await this.prisma.sucursal.findMany({
      where: { activa: true },
      include: {
        tienda: true,
        inventario: {
          include: {
            producto: true
          }
        },
        ventas: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            inventario: true,
            ventas: true,
            usuarioSucursal: true
          }
        }
      },
      orderBy: { nombre: 'asc' }
    });

    return sucursales.map(sucursal => new SucursalResponseDto(sucursal));
  }

  async findOne(id: number): Promise<any> {
    const sucursal = await this.prisma.sucursal.findUnique({
      where: { id },
      include: {
        tienda: {
          include: {
            configWeb: true
          }
        },
        inventario: {
          include: {
            producto: {
              include: {
                categoria: true,
                imagenes: true
              }
            }
          }
        },
        ventas: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: {
                producto: true
              }
            }
          }
        },
        usuarioSucursal: {
          include: {
            usuario: {
              select: {
                id: true,
                email: true,
                nombre: true,
                rol: true
              }
            }
          }
        },
        _count: {
          select: {
            inventario: true,
            ventas: true,
            usuarioSucursal: true
          }
        }
      }
    });

    if (!sucursal) {
      throw new NotFoundException(`Sucursal con ID ${id} no encontrada`);
    }

    return sucursal;
  }

  async findByTienda(tiendaId: number): Promise<SucursalResponseDto[]> {
    // Verificar que la tienda existe
    const tienda = await this.prisma.tienda.findUnique({
      where: { id: tiendaId }
    });

    if (!tienda) {
      throw new NotFoundException(`Tienda con ID ${tiendaId} no encontrada`);
    }

    const sucursales = await this.prisma.sucursal.findMany({
      where: { 
        tiendaId,
        activa: true 
      },
      include: {
        tienda: true,
        inventario: {
          include: {
            producto: true
          }
        },
        _count: {
          select: {
            inventario: true,
            ventas: true,
            usuarioSucursal: true
          }
        }
      },
      orderBy: { nombre: 'asc' }
    });

    return sucursales.map(sucursal => new SucursalResponseDto(sucursal));
  }

  async update(id: number, updateSucursalDto: UpdateSucursalDto): Promise<SucursalResponseDto> {
    await this.findOne(id); // Verificar que existe

    try {
      const sucursal = await this.prisma.sucursal.update({
        where: { id },
        data: updateSucursalDto,
        include: {
          tienda: true,
          inventario: true
        }
      });

      return new SucursalResponseDto(sucursal);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Error al actualizar la sucursal');
        }
      }
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id); // Verificar que existe

    // En lugar de eliminar, marcamos como inactiva
    await this.prisma.sucursal.update({
      where: { id },
      data: { activa: false }
    });
  }

  async getEstadisticas(id: number): Promise<any> {
    const sucursal = await this.findOne(id);

    const [
      totalProductos,
      totalVentas,
      totalUsuarios,
      ventasMensuales,
      stockTotal
    ] = await Promise.all([
      this.prisma.inventarioSucursal.count({ 
        where: { sucursalId: id } 
      }),
      this.prisma.venta.count({ 
        where: { sucursalId: id } 
      }),
      this.prisma.usuarioSucursal.count({ 
        where: { sucursalId: id } 
      }),
      this.prisma.venta.groupBy({
        by: ['createdAt'],
        where: { 
          sucursalId: id,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Últimos 30 días
          }
        },
        _sum: {
          total: true
        }
      }),
      this.prisma.inventarioSucursal.aggregate({
        where: { sucursalId: id },
        _sum: { stock: true }
      })
    ]);

    return {
      sucursal: new SucursalResponseDto(sucursal),
      estadisticas: {
        totalProductos,
        totalVentas,
        totalUsuarios,
        ventasMensuales: ventasMensuales.reduce((total, venta) => 
          total + (venta._sum.total?.toNumber() || 0), 0
        ),
        stockTotal: stockTotal._sum.stock || 0
      }
    };
  }

  async getInventario(sucursalId: number): Promise<any> {
    const sucursal = await this.findOne(sucursalId);

    const inventario = await this.prisma.inventarioSucursal.findMany({
      where: { sucursalId },
      include: {
        producto: {
          include: {
            categoria: true,
            subcategoria: true,
            imagenes: true
          }
        }
      },
      orderBy: { producto: { nombre: 'asc' } }
    });

    return {
      sucursal: new SucursalResponseDto(sucursal),
      inventario
    };
  }

  async getProductosBajoStock(sucursalId: number, stockMinimo: number = 5): Promise<any> {
    const sucursal = await this.findOne(sucursalId);

    const productosBajoStock = await this.prisma.inventarioSucursal.findMany({
      where: { 
        sucursalId,
        stock: { lte: stockMinimo }
      },
      include: {
        producto: {
          include: {
            categoria: true,
            imagenes: true
          }
        }
      },
      orderBy: { stock: 'asc' }
    });

    return {
      sucursal: new SucursalResponseDto(sucursal),
      productosBajoStock,
      total: productosBajoStock.length
    };
  }

  async transferirProducto(sucursalOrigenId: number, sucursalDestinoId: number, productoId: number, cantidad: number): Promise<any> {
    if (sucursalOrigenId === sucursalDestinoId) {
      throw new BadRequestException('No se puede transferir a la misma sucursal');
    }

    if (cantidad <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a 0');
    }

    // Verificar existencia en sucursal origen
    const inventarioOrigen = await this.prisma.inventarioSucursal.findUnique({
      where: {
        productoId_sucursalId: {
          productoId,
          sucursalId: sucursalOrigenId
        }
      }
    });

    if (!inventarioOrigen || inventarioOrigen.stock < cantidad) {
      throw new BadRequestException('Stock insuficiente en la sucursal de origen');
    }

    // Verificar existencia en sucursal destino
    const inventarioDestino = await this.prisma.inventarioSucursal.findUnique({
      where: {
        productoId_sucursalId: {
          productoId,
          sucursalId: sucursalDestinoId
        }
      }
    });

    // Iniciar transacción
    return this.prisma.$transaction(async (prisma) => {
      // Restar stock de origen
      await prisma.inventarioSucursal.update({
        where: {
          productoId_sucursalId: {
            productoId,
            sucursalId: sucursalOrigenId
          }
        },
        data: {
          stock: { decrement: cantidad }
        }
      });

      // Sumar stock a destino (o crear registro si no existe)
      if (inventarioDestino) {
        await prisma.inventarioSucursal.update({
          where: {
            productoId_sucursalId: {
              productoId,
              sucursalId: sucursalDestinoId
            }
          },
          data: {
            stock: { increment: cantidad }
          }
        });
      } else {
        await prisma.inventarioSucursal.create({
          data: {
            productoId,
            sucursalId: sucursalDestinoId,
            tiendaId: inventarioOrigen.tiendaId,
            stock: cantidad,
            stockMinimo: inventarioOrigen.stockMinimo
          }
        });
      }

      // Registrar movimiento de inventario
      // (Aquí podrías crear un registro en tu tabla de movimientos)

      return {
        message: 'Transferencia realizada exitosamente',
        cantidad,
        productoId,
        sucursalOrigenId,
        sucursalDestinoId
      };
    });
  }
}