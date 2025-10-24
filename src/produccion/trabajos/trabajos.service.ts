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
        
        // Desestructurar pesoTotal para la verificación y el descuento
        const { parametrosTelaId, costureroId, tiendaId, pesoTotal, ...trabajoData } = createTrabajoDto as any; 
        
        // 1. **Verificaciones Preliminares (FUERA DE LA TRANSACCIÓN)**

        // A. Verificar Parámetros de Tela y Obtener Inventario ID
        const parametrosTela = await this.prisma.parametrosTela.findUnique({
            where: { id: parametrosTelaId },
            select: { id: true, telaId: true }
        });

        if (!parametrosTela) {
            throw new NotFoundException(`Parámetros de tela con ID ${parametrosTelaId} no encontrados`);
        }
        
        if (!parametrosTela.telaId) {
             throw new BadRequestException(`Los Parámetros de Tela con ID ${parametrosTelaId} no tienen un Inventario de Tela asociado.`);
        }

        // B. Verificar Stock disponible
        const inventarioTela = await this.prisma.inventarioTela.findUnique({
            where: { id: parametrosTela.telaId },
            select: { id: true, pesoGrupo: true, color: true }
        });

        if (!inventarioTela) {
            throw new NotFoundException(`El Inventario de Tela asociado con ID ${parametrosTela.telaId} no fue encontrado.`);
        }
        
        const pesoDisponible = inventarioTela.pesoGrupo;
        const pesoRequerido = pesoTotal;
        
        // Manejo de Decimal de Prisma si es necesario, de lo contrario, asume float/number
        const pesoDisponibleNum = typeof pesoDisponible === 'number' ? pesoDisponible : (pesoDisponible as any).toNumber();

        if (pesoRequerido > pesoDisponibleNum) {
            throw new BadRequestException(
                `Stock insuficiente. Se requieren ${pesoRequerido} kg, pero solo hay ${pesoDisponibleNum} kg disponibles para la tela color '${inventarioTela.color}'.`
            );
        }
        
        // C. Verificar Costurero (si existe) y Tienda
        if (costureroId) {
          const costurero = await this.prisma.costurero.findUnique({ where: { id: costureroId } });
          if (!costurero) {
            throw new NotFoundException(`Costurero con ID ${costureroId} no encontrado`);
          }
        }
        const tienda = await this.prisma.tienda.findUnique({ where: { id: tiendaId } });
        if (!tienda) {
          throw new NotFoundException(`Tienda con ID ${tiendaId} no encontrada`);
        }

        // Generar código de trabajo
        const codigoTrabajo = trabajoData.codigoTrabajo || await this.generarCodigoTrabajo();

        // 2. **Ejecutar la Transacción: Crear Trabajo y Actualizar Inventario**
        
        let trabajoCreado;

        try {
            await this.prisma.$transaction(async (tx) => {
                
               // 2.1. Descontar el peso del inventario de tela
                await tx.inventarioTela.update({
                    // ⭐ CORRECCIÓN CLAVE: Usar 'parametrosTela.telaInventarioId' 
                    // y el operador de aserción '!' para indicar que ya se verificó que no es null ⭐
                    where: { id: parametrosTela.telaId! }, 
                    data: { 
                        pesoGrupo: { decrement: pesoRequerido } 
                    }
                });

                // 2.2. Crear el registro de TrabajoEnProceso
                trabajoCreado = await tx.trabajoEnProceso.create({
                    data: {
                        ...trabajoData,
                        codigoTrabajo,
                        pesoTotal: pesoRequerido, 
                        parametrosTela: { connect: { id: parametrosTelaId } },
                        tienda: { connect: { id: tiendaId } },
                        ...(costureroId && { costurero: { connect: { id: costureroId } } }),
                        ...(trabajoData.fechaInicio && { fechaInicio: new Date(trabajoData.fechaInicio) }),
                        ...(trabajoData.fechaFinEstimada && { fechaFinEstimada: new Date(trabajoData.fechaFinEstimada) })
                    },
                    // Incluimos las relaciones para poder devolver el DTO de respuesta
                    include: {
                        parametrosTela: {
                            include: {
                                producto: { select: { id: true, nombre: true } },
                                tela: {
                                    include: {
                                        tela: {
                                            select: { id: true, nombreComercial: true, tipoTela: true }
                                        }
                                    }
                                }
                            }
                        },
                        costurero: { select: { id: true, nombre: true, apellido: true, estado: true } },
                        tienda: { select: { id: true, nombre: true } }
                    }
                });
            });

            // 3. Devolver la respuesta
            if (!trabajoCreado) {
                 // Este caso solo ocurre si la transacción falla en la creación por alguna razón no capturada.
                throw new Error("La creación del trabajo falló dentro de la transacción.");
            }
            return new TrabajoResponseDto(trabajoCreado);
            
        } catch (error) {
            // Manejo de errores de Prisma
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    throw new ConflictException(`Error al crear el trabajo: Código '${codigoTrabajo}' duplicado.`);
                }
                // Manejo de error específico si el decremento intenta bajar de cero
                if (error.code === 'P2004') {
                     // Este error es menos común, pero es bueno manejarlo
                    throw new BadRequestException("Error en la actualización del inventario: El peso resultante es negativo.");
                }
            }
            // Lanzar el error original si no es un error de Prisma conocido
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
                  nombre: true,
                  imagenes:true
                }
              },
              tela: {
                select: {
                  id: true,
                  color:true,
              tipoTela: true,
              pesoGrupo:true,
             tela:true,
                }
              },
             
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
                color:true,
              tipoTela: true,
              pesoGrupo:true,
             tela:true,
               
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
               color:true,
              tipoTela: true,
              pesoGrupo:true,
             tela:true,
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
                  color:true,
              tipoTela: true,
              pesoGrupo:true,
             tela:true,
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
                color:true,
              tipoTela: true,
              pesoGrupo:true,
             tela:true,
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
               color:true,
              tipoTela: true,
              pesoGrupo:true,
             tela:true,
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
                color:true,
              tipoTela: true,
              pesoGrupo:true,
             tela:true,
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
                color:true,
              tipoTela: true,
              pesoGrupo:true,
             tela:true,
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

    // ⭐ 1. DETERMINAR EL ID DE LA TIENDA DINÁMICAMENTE
    const tiendaId = completarDto.tiendaId || trabajo.tiendaId; 

    // Verificar que la tienda existe (lógica existente)
    const tienda = await this.prisma.tienda.findUnique({
        where: { id: tiendaId }
    });

    if (!tienda) {
        throw new NotFoundException(`Tienda con ID ${tiendaId} no encontrada`);
    }

    // Obtener el productoId antes de la transacción
    const productoIdProducido = trabajo.parametrosTela?.producto?.id;

    try {
        const result = await this.prisma.$transaction(async (prisma) => {
            
            // 2. Actualizar el trabajo (lógica existente)
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

            // 3. Crear el trabajo finalizado (lógica existente)
            const trabajoFinalizado = await prisma.trabajoFinalizado.create({
                data: {
                    trabajoEnProceso: { connect: { id } },
                    fechaFinalizacion: new Date(completarDto.fechaFinalizacion),
                    cantidadProducida: completarDto.cantidadProducida,
                    calidad: completarDto.calidad,
                    notas: completarDto.notas,
                     costo:completarDto.costo,
                    tienda: { connect: { id: tiendaId } }
                }
            });

            // 4. LÓGICA DE ACTUALIZACIÓN DE INVENTARIO (Upsert)
            if (productoIdProducido) {
                const cantidadAñadir = completarDto.cantidadProducida;
                
                // Intentar encontrar el inventario existente para el producto en la TIENDA DINÁMICA
                const inventarioExistente = await prisma.inventarioTienda.findUnique({
                    where: { 
                        productoId_tiendaId: {
                            productoId: productoIdProducido,
                            tiendaId: tiendaId, // ⭐ USANDO EL ID DE TIENDA DINÁMICO
                        }
                    }
                });

                let stockAnterior: number;
                let inventarioActualizado: any;

                if (inventarioExistente) {
                    // El producto YA EXISTE -> Actualizar stock
                    stockAnterior = inventarioExistente.stock;
                    inventarioActualizado = await prisma.inventarioTienda.update({
                        where: { id: inventarioExistente.id },
                        data: { stock: { increment: cantidadAñadir } }
                    });
                } else {
                    // El producto NO EXISTE -> Crear nuevo registro
                    stockAnterior = 0;
                    inventarioActualizado = await prisma.inventarioTienda.create({
                        data: {
                            productoId: productoIdProducido,
                            tiendaId: tiendaId, // ⭐ USANDO EL ID DE TIENDA DINÁMICO
                            stock: cantidadAñadir,
                            stockMinimo: 0,
                        }
                    });
                }

                // 5. Registrar Movimiento de Inventario (Entrada por Producción)
                await prisma.movimientoInventario.create({
                    data: {
                        tipo: 'ENTRADA_PRODUCCION', 
                        cantidad: cantidadAñadir,
                        productoId: productoIdProducido,
                        motivo: `Entrada por finalización de Trabajo #${id} en Tienda #${tiendaId}`,
                        usuarioId: 1,
                        inventarioTiendaId: inventarioActualizado.id,
                        stockAnterior: stockAnterior,
                        stockNuevo: inventarioActualizado.stock,
                    }
                });

            } else {
                console.warn(`Trabajo ${id} completado, pero no se encontró producto asociado en parametrosTela. Inventario NO actualizado.`);
            }

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