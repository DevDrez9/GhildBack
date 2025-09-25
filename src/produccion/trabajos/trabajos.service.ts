import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

import { CreateTrabajoDto } from './dto/create-trabajo.dto';
import { UpdateTrabajoDto } from './dto/update-trabajo.dto';
import { UpdateEstadoTrabajoDto } from './dto/update-estado-trabajo.dto';
import { CompletarTrabajoDto } from './dto/completar-trabajo.dto';
import { FilterTrabajoDto } from './dto/filter-trabajo.dto';
import { TrabajoResponseDto } from './dto/trabajo-response.dto';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from 'generated/prisma/client';

@Injectable()
export class TrabajosService {
  constructor(private readonly prisma: PrismaService) {}

  private async generarCodigoTrabajo(): Promise<string> {
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const day = new Date().getDate().toString().padStart(2, '0');
    
    const count = await this.prisma.trabajoEnProceso.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    });

    const numero = (count + 1).toString().padStart(4, '0');
    return `TRB-${year}${month}${day}-${numero}`;
  }

  async create(createTrabajoDto: CreateTrabajoDto): Promise<TrabajoResponseDto> {
    const { parametrosTelaId, costureroId, tiendaId, ...trabajoData } = createTrabajoDto;

    // Verificar que los parámetros de tela existen
    const parametrosTela = await this.prisma.parametrosTela.findUnique({
      where: { id: parametrosTelaId }
    });

    if (!parametrosTela) {
      throw new NotFoundException(`Parámetros de tela con ID ${parametrosTelaId} no encontrados`);
    }

    // Verificar que el costurero existe si se proporciona
    if (costureroId) {
      const costurero = await this.prisma.costurero.findUnique({
        where: { id: costureroId }
      });

      if (!costurero) {
        throw new NotFoundException(`Costurero con ID ${costureroId} no encontrado`);
      }
    }

    // Verificar que la tienda existe
    const tienda = await this.prisma.tienda.findUnique({
      where: { id: tiendaId }
    });

    if (!tienda) {
      throw new NotFoundException(`Tienda con ID ${tiendaId} no encontrada`);
    }

    // Generar código de trabajo
    const codigoTrabajo = createTrabajoDto.codigoTrabajo || await this.generarCodigoTrabajo();

    try {
      const trabajo = await this.prisma.trabajoEnProceso.create({
        data: {
          ...trabajoData,
          codigoTrabajo,
          parametrosTela: { connect: { id: parametrosTelaId } },
          tienda: { connect: { id: tiendaId } },
          ...(costureroId && { costurero: { connect: { id: costureroId } } }),
          ...(trabajoData.fechaInicio && { fechaInicio: new Date(trabajoData.fechaInicio) }),
          ...(trabajoData.fechaFinEstimada && { fechaFinEstimada: new Date(trabajoData.fechaFinEstimada) })
        },
        include: {
          parametrosTela: {
            include: {
              producto: {
                select: {
                  id: true,
                  nombre: true
                }
              },
              tela: {
                select: {
                  id: true,
                  nombreComercial: true
                }
              }
            }
          },
          costurero: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              estado: true
            }
          },
          tienda: {
            select: {
              id: true,
              nombre: true
            }
          }
        }
      });

      return new TrabajoResponseDto(trabajo);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Error al crear el trabajo');
        }
      }
      throw error;
    }
  }

  async findAll(filterTrabajoDto: FilterTrabajoDto = {}): Promise<{ trabajos: TrabajoResponseDto[], total: number }> {
    const {
      search,
      estado,
      costureroId,
      parametrosTelaId,
      tiendaId,
      fechaInicioDesde,
      fechaInicioHasta,
      fechaFinDesde,
      fechaFinHasta,
      page = 1,
      limit = 10
    } = filterTrabajoDto;

    const where: Prisma.TrabajoEnProcesoWhereInput = {};

    if (estado) where.estado = estado;
    if (costureroId) where.costureroId = costureroId;
    if (parametrosTelaId) where.parametrosTelaId = parametrosTelaId;
    if (tiendaId) where.tiendaId = tiendaId;

    // Filtros de fecha
    if (fechaInicioDesde || fechaInicioHasta) {
      where.fechaInicio = {};
      if (fechaInicioDesde) where.fechaInicio.gte = new Date(fechaInicioDesde);
      if (fechaInicioHasta) {
        const fechaHasta = new Date(fechaInicioHasta);
        fechaHasta.setHours(23, 59, 59, 999);
        where.fechaInicio.lte = fechaHasta;
      }
    }

    if (fechaFinDesde || fechaFinHasta) {
      where.fechaFinEstimada = {};
      if (fechaFinDesde) where.fechaFinEstimada.gte = new Date(fechaFinDesde);
      if (fechaFinHasta) {
        const fechaHasta = new Date(fechaFinHasta);
        fechaHasta.setHours(23, 59, 59, 999);
        where.fechaFinEstimada.lte = fechaHasta;
      }
    }

    if (search) {
      where.OR = [
        { codigoTrabajo: { contains: search} },
        { notas: { contains: search} },
        {
          parametrosTela: {
            OR: [
              { codigoReferencia: { contains: search} },
              { nombreModelo: { contains: search} }
            ]
          }
        }
      ];
    }

    const [trabajos, total] = await Promise.all([
      this.prisma.trabajoEnProceso.findMany({
        where,
        include: {
          parametrosTela: {
            include: {
              producto: {
                select: {
                  id: true,
                  nombre: true
                }
              },
              tela: {
                select: {
                  id: true,
                  nombreComercial: true
                }
              }
            }
          },
          costurero: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              estado: true
            }
          },
          tienda: {
            select: {
              id: true,
              nombre: true
            }
          },
          trabajoFinalizado: true
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      this.prisma.trabajoEnProceso.count({ where })
    ]);

    return {
      trabajos: trabajos.map(trabajo => new TrabajoResponseDto(trabajo)),
      total
    };
  }

  async findOne(id: number): Promise<TrabajoResponseDto> {
    const trabajo = await this.prisma.trabajoEnProceso.findUnique({
      where: { id },
      include: {
        parametrosTela: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
                sku: true
              }
            },
            tela: {
              select: {
                id: true,
                nombreComercial: true,
                tipoTela: true,
                proveedor: {
                  select: {
                    id: true,
                    nombre: true
                  }
                }
              }
            }
          }
        },
        costurero: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            estado: true,
            telefono: true,
            email: true
          }
        },
        tienda: {
          select: {
            id: true,
            nombre: true,
            dominio: true
          }
        },
        trabajoFinalizado: true
      }
    });

    if (!trabajo) {
      throw new NotFoundException(`Trabajo con ID ${id} no encontrado`);
    }

    return new TrabajoResponseDto(trabajo);
  }

  async findByCodigo(codigo: string): Promise<TrabajoResponseDto> {
    const trabajo = await this.prisma.trabajoEnProceso.findUnique({
      where: { codigoTrabajo: codigo },
      include: {
        parametrosTela: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true
              }
            },
            tela: {
              select: {
                id: true,
                nombreComercial: true
              }
            }
          }
        },
        costurero: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            estado: true
          }
        },
        tienda: {
          select: {
            id: true,
            nombre: true
          }
        },
        trabajoFinalizado: true
      }
    });

    if (!trabajo) {
      throw new NotFoundException(`Trabajo con código '${codigo}' no encontrado`);
    }

    return new TrabajoResponseDto(trabajo);
  }

  async update(id: number, updateTrabajoDto: UpdateTrabajoDto): Promise<TrabajoResponseDto> {
    const trabajo = await this.findOne(id);
    const { parametrosTelaId, costureroId, tiendaId, ...trabajoData } = updateTrabajoDto;

    // Solo permitir actualizar trabajos en estado PENDIENTE o PAUSADO
    if (trabajo.estado !== 'PENDIENTE' && trabajo.estado !== 'PAUSADO') {
      throw new BadRequestException('Solo se pueden modificar trabajos en estado PENDIENTE o PAUSADO');
    }

    try {
      const data: Prisma.TrabajoEnProcesoUpdateInput = { ...trabajoData };

      // Manejar actualización de parámetros de tela
      if (parametrosTelaId && parametrosTelaId !== trabajo.parametrosTelaId) {
        const parametrosTela = await this.prisma.parametrosTela.findUnique({
          where: { id: parametrosTelaId }
        });

        if (!parametrosTela) {
          throw new NotFoundException(`Parámetros de tela con ID ${parametrosTelaId} no encontrados`);
        }

        data.parametrosTela = { connect: { id: parametrosTelaId } };
      }

      // Manejar actualización del costurero
      if (costureroId !== undefined) {
        if (costureroId === null) {
          data.costurero = { disconnect: true };
        } else if (costureroId !== trabajo.costureroId) {
          const costurero = await this.prisma.costurero.findUnique({
            where: { id: costureroId }
          });

          if (!costurero) {
            throw new NotFoundException(`Costurero con ID ${costureroId} no encontrado`);
          }

          data.costurero = { connect: { id: costureroId } };
        }
      }

      // Manejar actualización de la tienda
      if (tiendaId && tiendaId !== trabajo.tiendaId) {
        const tienda = await this.prisma.tienda.findUnique({
          where: { id: tiendaId }
        });

        if (!tienda) {
          throw new NotFoundException(`Tienda con ID ${tiendaId} no encontrada`);
        }

        data.tienda = { connect: { id: tiendaId } };
      }

      // Manejar fechas
      if (trabajoData.fechaInicio) {
        data.fechaInicio = new Date(trabajoData.fechaInicio as string);
      }
      if (trabajoData.fechaFinEstimada) {
        data.fechaFinEstimada = new Date(trabajoData.fechaFinEstimada as string);
      }

      const updatedTrabajo = await this.prisma.trabajoEnProceso.update({
        where: { id },
        data,
        include: {
          parametrosTela: {
            include: {
              producto: {
                select: {
                  id: true,
                  nombre: true
                }
              },
              tela: {
                select: {
                  id: true,
                  nombreComercial: true
                }
              }
            }
          },
          costurero: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              estado: true
            }
          },
          tienda: {
            select: {
              id: true,
              nombre: true
            }
          },
          trabajoFinalizado: true
        }
      });

      return new TrabajoResponseDto(updatedTrabajo);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Error al actualizar el trabajo');
        }
      }
      throw error;
    }
  }

  async updateEstado(id: number, updateEstadoDto: UpdateEstadoTrabajoDto): Promise<TrabajoResponseDto> {
    const trabajo = await this.findOne(id);

    const data: Prisma.TrabajoEnProcesoUpdateInput = {
      estado: updateEstadoDto.estado
    };

    // Manejar lógica específica por estado
    if (updateEstadoDto.estado === 'EN_PROCESO' && !trabajo.fechaInicio) {
      data.fechaInicio = new Date();
    } else if (updateEstadoDto.estado === 'COMPLETADO') {
      throw new BadRequestException('Use el endpoint específico para completar trabajos');
    }

    if (updateEstadoDto.notas) {
      data.notas = trabajo.notas 
        ? `${trabajo.notas} | ${updateEstadoDto.notas}` 
        : updateEstadoDto.notas;
    }

    const updatedTrabajo = await this.prisma.trabajoEnProceso.update({
      where: { id },
      data,
      include: {
        parametrosTela: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true
              }
            },
            tela: {
              select: {
                id: true,
                nombreComercial: true
              }
            }
          }
        },
        costurero: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            estado: true
          }
        },
        tienda: {
          select: {
            id: true,
            nombre: true
            }
        },
        trabajoFinalizado: true
      }
    });

    return new TrabajoResponseDto(updatedTrabajo);
  }

  async asignarCosturero(id: number, costureroId: number): Promise<TrabajoResponseDto> {
    const trabajo = await this.findOne(id);

    // Verificar que el trabajo esté en estado válido para asignar
    if (trabajo.estado !== 'PENDIENTE' && trabajo.estado !== 'PAUSADO') {
      throw new BadRequestException('Solo se pueden asignar costureros a trabajos en estado PENDIENTE o PAUSADO');
    }

    const costurero = await this.prisma.costurero.findUnique({
      where: { id: costureroId }
    });

    if (!costurero) {
      throw new NotFoundException(`Costurero con ID ${costureroId} no encontrado`);
    }

    // Verificar que el costurero esté activo
    if (costurero.estado !== 'ACTIVO') {
      throw new BadRequestException('El costurero debe estar activo para asignarle trabajos');
    }

    const updatedTrabajo = await this.prisma.trabajoEnProceso.update({
      where: { id },
      data: {
        costurero: { connect: { id: costureroId } },
        estado: 'PENDIENTE' // Cambiar a pendiente si estaba pausado
      },
      include: {
        parametrosTela: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true
              }
            },
            tela: {
              select: {
                id: true,
                nombreComercial: true
              }
            }
          }
        },
        costurero: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            estado: true
          }
        },
        tienda: {
          select: {
            id: true,
            nombre: true
          }
        },
        trabajoFinalizado: true
      }
    });

    return new TrabajoResponseDto(updatedTrabajo);
  }

  async iniciarTrabajo(id: number): Promise<TrabajoResponseDto> {
    const trabajo = await this.findOne(id);

    if (trabajo.estado !== 'PENDIENTE') {
      throw new BadRequestException('Solo se pueden iniciar trabajos en estado PENDIENTE');
    }

    if (!trabajo.costureroId) {
      throw new BadRequestException('El trabajo debe tener un costurero asignado para iniciarse');
    }

    const updatedTrabajo = await this.prisma.trabajoEnProceso.update({
      where: { id },
      data: {
        estado: 'EN_PROCESO',
        fechaInicio: new Date()
      },
      include: {
        parametrosTela: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true
              }
            },
            tela: {
              select: {
                id: true,
                nombreComercial: true
              }
            }
          }
        },
        costurero: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            estado: true
          }
        },
        tienda: {
          select: {
            id: true,
            nombre: true
          }
        },
        trabajoFinalizado: true
      }
    });

    return new TrabajoResponseDto(updatedTrabajo);
  }

  async pausarTrabajo(id: number): Promise<TrabajoResponseDto> {
    const trabajo = await this.findOne(id);

    if (trabajo.estado !== 'EN_PROCESO') {
      throw new BadRequestException('Solo se pueden pausar trabajos en estado EN_PROCESO');
    }

    const updatedTrabajo = await this.prisma.trabajoEnProceso.update({
      where: { id },
      data: {
        estado: 'PAUSADO'
      },
      include: {
        parametrosTela: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true
              }
            },
            tela: {
              select: {
                id: true,
                nombreComercial: true
              }
            }
          }
        },
        costurero: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            estado: true
          }
        },
        tienda: {
          select: {
            id: true,
            nombre: true
          }
        },
        trabajoFinalizado: true
      }
    });

    return new TrabajoResponseDto(updatedTrabajo);
  }

  async completarTrabajo(id: number, completarDto: CompletarTrabajoDto): Promise<TrabajoResponseDto> {
    const trabajo = await this.findOne(id);

    if (trabajo.estado !== 'EN_PROCESO' && trabajo.estado !== 'PAUSADO') {
      throw new BadRequestException('Solo se pueden completar trabajos en estado EN_PROCESO o PAUSADO');
    }

    if (completarDto.cantidadProducida > trabajo.cantidad) {
      throw new BadRequestException('La cantidad producida no puede ser mayor que la cantidad planificada');
    }

    const tiendaId = completarDto.tiendaId || trabajo.tiendaId;

    // Verificar que la tienda existe
    const tienda = await this.prisma.tienda.findUnique({
      where: { id: tiendaId }
    });

    if (!tienda) {
      throw new NotFoundException(`Tienda con ID ${tiendaId} no encontrada`);
    }

    try {
      const result = await this.prisma.$transaction(async (prisma) => {
        // Actualizar el trabajo
        const updatedTrabajo = await prisma.trabajoEnProceso.update({
          where: { id },
          data: {
            estado: 'COMPLETADO',
            fechaFinReal: new Date()
          },
          include: {
            parametrosTela: {
              include: {
                producto: true,
                tela: true
              }
            },
            costurero: true,
            tienda: true
          }
        });

        // Crear el trabajo finalizado
        const trabajoFinalizado = await prisma.trabajoFinalizado.create({
          data: {
            trabajoEnProceso: { connect: { id } },
            fechaFinalizacion: new Date(completarDto.fechaFinalizacion),
            cantidadProducida: completarDto.cantidadProducida,
            calidad: completarDto.calidad,
            notas: completarDto.notas,
            tienda: { connect: { id: tiendaId } }
          }
        });

        return { ...updatedTrabajo, trabajoFinalizado };
      });

      return new TrabajoResponseDto(result);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Error al completar el trabajo');
        }
      }
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    const trabajo = await this.findOne(id);

    // Solo permitir eliminar trabajos en estado PENDIENTE o CANCELADO
    if (trabajo.estado !== 'PENDIENTE' && trabajo.estado !== 'CANCELADO') {
      throw new BadRequestException('Solo se pueden eliminar trabajos en estado PENDIENTE o CANCELADO');
    }

    // Verificar si tiene trabajo finalizado
    if (trabajo.trabajoFinalizado) {
      throw new ConflictException('No se puede eliminar un trabajo que ya fue finalizado');
    }

    await this.prisma.trabajoEnProceso.delete({
      where: { id }
    });
  }

  async getEstadisticas(tiendaId?: number): Promise<any> {
    const where: Prisma.TrabajoEnProcesoWhereInput = {};
    
    if (tiendaId) {
      where.tiendaId = tiendaId;
    }

    const [
      totalTrabajos,
      trabajosPendientes,
      trabajosEnProceso,
      trabajosCompletados,
      trabajosCancelados,
      trabajosEsteMes,
      totalUnidadesProducidas
    ] = await Promise.all([
      this.prisma.trabajoEnProceso.count({ where }),
      this.prisma.trabajoEnProceso.count({ where: { ...where, estado: 'PENDIENTE' } }),
      this.prisma.trabajoEnProceso.count({ where: { ...where, estado: 'EN_PROCESO' } }),
      this.prisma.trabajoEnProceso.count({ where: { ...where, estado: 'COMPLETADO' } }),
      this.prisma.trabajoEnProceso.count({ where: { ...where, estado: 'CANCELADO' } }),
      this.prisma.trabajoEnProceso.count({
        where: {
          ...where,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      this.prisma.trabajoFinalizado.aggregate({
        where: tiendaId ? {
          trabajoEnProceso: {
            tiendaId: tiendaId
          }
        } : {},
        _sum: { cantidadProducida: true }
      })
    ]);

    return {
      totalTrabajos,
      trabajosPendientes,
      trabajosEnProceso,
      trabajosCompletados,
      trabajosCancelados,
      trabajosEsteMes,
      totalUnidadesProducidas: totalUnidadesProducidas._sum.cantidadProducida || 0
    };
  }
}