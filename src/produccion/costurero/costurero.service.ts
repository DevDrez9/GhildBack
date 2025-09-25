import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';

import { CreateCostureroDto } from './dto/create-costurero.dto';
import { UpdateCostureroDto } from './dto/update-costurero.dto';
import { UpdateEstadoCostureroDto } from './dto/update-estado-costurero.dto';
import { FilterCostureroDto } from './dto/filter-costurero.dto';
import { CostureroResponseDto } from './dto/costurero-response.dto';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from 'generated/prisma/client';

@Injectable()
export class CostureroService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCostureroDto: CreateCostureroDto): Promise<CostureroResponseDto> {
    const { usuarioId, tiendaId, ...costureroData } = createCostureroDto;

    // Verificar que la tienda existe
    const tienda = await this.prisma.tienda.findUnique({
      where: { id: tiendaId }
    });

    if (!tienda) {
      throw new NotFoundException(`Tienda con ID ${tiendaId} no encontrada`);
    }

    // Verificar que el usuario existe si se proporciona
    if (usuarioId) {
      const usuario = await this.prisma.usuario.findUnique({
        where: { id: usuarioId }
      });

      if (!usuario) {
        throw new NotFoundException(`Usuario con ID ${usuarioId} no encontrado`);
      }
    }

    try {
      const costurero = await this.prisma.costurero.create({
        data: {
          ...costureroData,
          fechaInicio: new Date(costureroData.fechaInicio),
          tienda: { connect: { id: tiendaId } },
          ...(usuarioId && { usuario: { connect: { id: usuarioId } } })
        },
        include: {
          usuario: {
            select: {
              id: true,
              nombre: true,
              email: true,
              rol: true
            }
          },
          tienda: {
            select: {
              id: true,
              nombre: true,
              dominio: true
            }
          }
        }
      });

      return new CostureroResponseDto(costurero);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Error al crear el costurero');
        }
      }
      throw error;
    }
  }

  async findAll(filterCostureroDto: FilterCostureroDto = {}): Promise<{ costureros: CostureroResponseDto[], total: number }> {
    const { search, estado, tiendaId, usuarioId, page = 1, limit = 10 } = filterCostureroDto;

    const where: Prisma.CostureroWhereInput = {};

    if (estado) where.estado = estado;
    if (tiendaId) where.tiendaId = tiendaId;
    if (usuarioId) where.usuarioId = usuarioId;

    if (search) {
      where.OR = [
        { nombre: { contains: search} },
        { apellido: { contains: search} },
        { email: { contains: search} },
        { telefono: { contains: search } }
      ];
    }

    const [costureros, total] = await Promise.all([
      this.prisma.costurero.findMany({
        where,
        include: {
          usuario: {
            select: {
              id: true,
              nombre: true,
              email: true,
              rol: true
            }
          },
          tienda: {
            select: {
              id: true,
              nombre: true,
              dominio: true
            }
          }
        },
        orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
        skip: (page - 1) * limit,
        take: limit
      }),
      this.prisma.costurero.count({ where })
    ]);

    return {
      costureros: costureros.map(costurero => new CostureroResponseDto(costurero)),
      total
    };
  }

  async findOne(id: number): Promise<CostureroResponseDto> {
    const costurero = await this.prisma.costurero.findUnique({
      where: { id },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            rol: true
          }
        },
        tienda: {
          select: {
            id: true,
            nombre: true,
            dominio: true
          }
        },
        trabajos: {
          include: {
            parametrosTela: {
              include: {
                producto: {
                  select: {
                    id: true,
                    nombre: true
                  }
                }
              }
            }
          },
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!costurero) {
      throw new NotFoundException(`Costurero con ID ${id} no encontrado`);
    }

    return new CostureroResponseDto(costurero);
  }

  async update(id: number, updateCostureroDto: UpdateCostureroDto): Promise<CostureroResponseDto> {
    const costurero = await this.findOne(id);
    const { usuarioId, tiendaId, ...costureroData } = updateCostureroDto;

    try {
      const data: Prisma.CostureroUpdateInput = { ...costureroData };

      if (tiendaId && tiendaId !== costurero.tiendaId) {
        const tienda = await this.prisma.tienda.findUnique({
          where: { id: tiendaId }
        });

        if (!tienda) {
          throw new NotFoundException(`Tienda con ID ${tiendaId} no encontrada`);
        }

        data.tienda = { connect: { id: tiendaId } };
      }

      if (usuarioId !== undefined) {
        if (usuarioId === null) {
          data.usuario = { disconnect: true };
        } else if (usuarioId !== costurero.usuarioId) {
          const usuario = await this.prisma.usuario.findUnique({
            where: { id: usuarioId }
          });

          if (!usuario) {
            throw new NotFoundException(`Usuario con ID ${usuarioId} no encontrado`);
          }

          data.usuario = { connect: { id: usuarioId } };
        }
      }

      // Manejar fecha de inicio si se actualiza
      if (costureroData.fechaInicio) {
        data.fechaInicio = new Date(costureroData.fechaInicio as string);
      }

      const updatedCosturero = await this.prisma.costurero.update({
        where: { id },
        data,
        include: {
          usuario: {
            select: {
              id: true,
              nombre: true,
              email: true,
              rol: true
            }
          },
          tienda: {
            select: {
              id: true,
              nombre: true,
              dominio: true
            }
          }
        }
      });

      return new CostureroResponseDto(updatedCosturero);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Error al actualizar el costurero');
        }
      }
      throw error;
    }
  }

  async updateEstado(id: number, updateEstadoDto: UpdateEstadoCostureroDto): Promise<CostureroResponseDto> {
    const costurero = await this.findOne(id);

    const updatedCosturero = await this.prisma.costurero.update({
      where: { id },
      data: { estado: updateEstadoDto.estado },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            rol: true
          }
        },
        tienda: {
          select: {
            id: true,
            nombre: true,
            dominio: true
            }
        }
      }
    });

    return new CostureroResponseDto(updatedCosturero);
  }

  async remove(id: number): Promise<void> {
    const costurero = await this.findOne(id);

    // Verificar si el costurero tiene trabajos asignados
    const totalTrabajos = await this.prisma.trabajoEnProceso.count({
      where: { costureroId: id }
    });

    if (totalTrabajos > 0) {
      throw new ConflictException('No se puede eliminar un costurero que tiene trabajos asignados');
    }

    await this.prisma.costurero.delete({
      where: { id }
    });
  }

  async getTrabajos(id: number, filters: any = {}): Promise<any> {
    const costurero = await this.findOne(id);

    const where: Prisma.TrabajoEnProcesoWhereInput = {
      costureroId: id
    };

    if (filters.estado) {
      where.estado = filters.estado;
    }

    if (filters.fechaInicio || filters.fechaFin) {
      where.createdAt = {};
      if (filters.fechaInicio) where.createdAt.gte = new Date(filters.fechaInicio);
      if (filters.fechaFin) {
        const fechaFin = new Date(filters.fechaFin);
        fechaFin.setHours(23, 59, 59, 999);
        where.createdAt.lte = fechaFin;
      }
    }

    const trabajos = await this.prisma.trabajoEnProceso.findMany({
      where,
      include: {
        parametrosTela: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        },
        tienda: {
          select: {
            id: true,
            nombre: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return trabajos;
  }

  async getEstadisticas(id: number): Promise<any> {
    const costurero = await this.findOne(id);

    const [
      totalTrabajos,
      trabajosPendientes,
      trabajosEnProceso,
      trabajosCompletados,
      trabajosEsteMes
    ] = await Promise.all([
      this.prisma.trabajoEnProceso.count({ where: { costureroId: id } }),
      this.prisma.trabajoEnProceso.count({ where: { costureroId: id, estado: 'PENDIENTE' } }),
      this.prisma.trabajoEnProceso.count({ where: { costureroId: id, estado: 'EN_PROCESO' } }),
      this.prisma.trabajoEnProceso.count({ where: { costureroId: id, estado: 'COMPLETADO' } }),
      this.prisma.trabajoEnProceso.count({
        where: {
          costureroId: id,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      })
    ]);

    return {
      costurero: new CostureroResponseDto(costurero),
      estadisticas: {
        totalTrabajos,
        trabajosPendientes,
        trabajosEnProceso,
        trabajosCompletados,
        trabajosEsteMes
      }
    };
  }
}