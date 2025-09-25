import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

import { CreateTiendaDto } from './dto/create-tienda.dto';
import { UpdateTiendaDto } from './dto/update-tienda.dto';
import { TiendaResponseDto } from './dto/tienda-response.dto';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from 'generated/prisma/client';

@Injectable()
export class TiendaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTiendaDto: CreateTiendaDto): Promise<TiendaResponseDto> {
    const { configWebId, ...tiendaData } = createTiendaDto;

    // Verificar que la configuración web existe
    const configWeb = await this.prisma.configWeb.findUnique({
      where: { id: configWebId }
    });

    if (!configWeb) {
      throw new NotFoundException(`ConfigWeb con ID ${configWebId} no encontrada`);
    }

    // Verificar si el dominio ya existe
    const existingTienda = await this.prisma.tienda.findUnique({
      where: { dominio: tiendaData.dominio }
    });

    if (existingTienda) {
      throw new ConflictException('El dominio ya está en uso');
    }

    try {
      const tienda = await this.prisma.tienda.create({
        data: {
          ...tiendaData,
          configWeb: {
            connect: { id: configWebId }
          }
        },
        include: {
          configWeb: true,
          categorias: true,
          sucursales: true
        }
      });

      return new TiendaResponseDto(tienda);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('El dominio ya está en uso');
        }
      }
      throw error;
    }
  }

  async findAll(): Promise<TiendaResponseDto[]> {
    const tiendas = await this.prisma.tienda.findMany({
      where: { activa: true },
      include: {
        configWeb: true,
        categorias: true,
        sucursales: true,
        _count: {
          select: {
            productos: true,
            usuarios: true,
            ventas: true
          }
        }
      },
      orderBy: { nombre: 'asc' }
    });

    return tiendas.map(tienda => new TiendaResponseDto(tienda));
  }

  async findOne(id: number): Promise<any> {
    const tienda = await this.prisma.tienda.findUnique({
      where: { id },
      include: {
        configWeb: true,
        categorias: {
          include: {
            subcategorias: true,
            productos: {
              take: 5,
              orderBy: { createdAt: 'desc' }
            }
          }
        },
        sucursales: true,
        productos: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            categoria: true,
            subcategoria: true
          }
        },
        usuarios: {
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
            productos: true,
            usuarios: true,
            ventas: true,
            sucursales: true
          }
        }
      }
    });

    if (!tienda) {
      throw new NotFoundException(`Tienda con ID ${id} no encontrada`);
    }

    return tienda;
  }

  async findByDominio(dominio: string): Promise<any> {
    const tienda = await this.prisma.tienda.findUnique({
      where: { dominio },
      include: {
        configWeb: {
          include: {
            banners: {
              orderBy: { orden: 'asc' }
            }
          }
        },
        categorias: {
          where: { productos: { some: {} } },
          include: {
            productos: {
              where: { stock: { gt: 0 } },
              take: 8,
              orderBy: { createdAt: 'desc' },
              include: {
                imagenes: {
                  take: 1,
                  orderBy: { orden: 'asc' }
                }
              }
            }
          }
        },
        productos: {
          where: { stock: { gt: 0 } },
          take: 12,
          orderBy: { createdAt: 'desc' },
          include: {
            imagenes: {
              take: 1,
              orderBy: { orden: 'asc' }
            },
            categoria: true
          }
        }
      }
    });

    if (!tienda) {
      throw new NotFoundException(`Tienda con dominio ${dominio} no encontrada`);
    }

    if (!tienda.activa) {
      throw new BadRequestException('La tienda no está activa');
    }

    return tienda;
  }

  async update(id: number, updateTiendaDto: UpdateTiendaDto): Promise<TiendaResponseDto> {
    await this.findOne(id); // Verificar que existe

    try {
      const tienda = await this.prisma.tienda.update({
        where: { id },
        data: updateTiendaDto,
        include: {
          configWeb: true,
          categorias: true,
          sucursales: true
        }
      });

      return new TiendaResponseDto(tienda);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('El dominio ya está en uso');
        }
      }
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id); // Verificar que existe

    // En lugar de eliminar, marcamos como inactiva
    await this.prisma.tienda.update({
      where: { id },
      data: { activa: false }
    });
  }

  async getTiendaPrincipal(): Promise<any> {
    const tienda = await this.prisma.tienda.findFirst({
      where: { 
        esPrincipal: true,
        activa: true 
      },
      include: {
        configWeb: {
          include: {
            banners: {
              orderBy: { orden: 'asc' }
            }
          }
        },
        categorias: {
          include: {
            productos: {
              take: 8,
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      }
    });

    if (!tienda) {
      throw new NotFoundException('No se encontró una tienda principal');
    }

    return tienda;
  }

  async setTiendaPrincipal(id: number): Promise<TiendaResponseDto> {
    const tienda = await this.findOne(id);

    // Quitar principal de todas las tiendas
    await this.prisma.tienda.updateMany({
      where: { esPrincipal: true },
      data: { esPrincipal: false }
    });

    // Establecer esta tienda como principal
    const tiendaPrincipal = await this.prisma.tienda.update({
      where: { id },
      data: { esPrincipal: true },
      include: {
        configWeb: true,
        categorias: true,
        sucursales: true
      }
    });

    return new TiendaResponseDto(tiendaPrincipal);
  }

  async getEstadisticas(id: number): Promise<any> {
    const tienda = await this.findOne(id);

    const [
      totalProductos,
      totalVentas,
      totalUsuarios,
      totalSucursales,
      ventasMensuales
    ] = await Promise.all([
      this.prisma.producto.count({ where: { tiendaId: id } }),
      this.prisma.venta.count({ where: { tiendaId: id } }),
      this.prisma.usuarioTienda.count({ where: { tiendaId: id } }),
      this.prisma.sucursal.count({ where: { tiendaId: id } }),
      this.prisma.venta.groupBy({
        by: ['createdAt'],
        where: { 
          tiendaId: id,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Últimos 30 días
          }
        },
        _sum: {
          total: true
        }
      })
    ]);

    return {
      tienda: new TiendaResponseDto(tienda),
      estadisticas: {
        totalProductos,
        totalVentas,
        totalUsuarios,
        totalSucursales,
        ventasMensuales: ventasMensuales.reduce((total, venta) => 
          total + (venta._sum.total?.toNumber() || 0), 0
        )
      }
    };
  }
}