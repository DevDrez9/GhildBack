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
    // 1. Obtener el trabajo
    const trabajo = await this.prisma.trabajoEnProceso.findUnique({
        where: { id },
        include: {
            parametrosTela: {
                include: { producto: true }
            },
            tienda: true
        }
    });

    if (!trabajo) {
        throw new NotFoundException(`Trabajo en proceso con ID ${id} no encontrado`);
    }

    if (trabajo.estado !== 'EN_PROCESO' && trabajo.estado !== 'PAUSADO') {
        throw new BadRequestException('Solo se pueden completar trabajos en estado EN_PROCESO o PAUSADO');
    }
    
    // --- 2. PARSEAR Y VALIDAR EL JSON DESDE 'cantidadProducida' ---
    let cantidadProducidaPorTalla: Record<string, number>;
    let totalUnidadesProducidas = 0;

    try {
        // completarDto.cantidadProducida viene como string: '{"S": 20, "M": 15}'
        cantidadProducidaPorTalla = JSON.parse(completarDto.cantidadProducida as unknown as string);
        
        // Validación básica: debe ser objeto y sus valores números positivos
        if (typeof cantidadProducidaPorTalla !== 'object' || cantidadProducidaPorTalla === null) {
             throw new Error('Formato inválido');
        }

        // Calcular el total de unidades y validar que sean números
        for (const key in cantidadProducidaPorTalla) {
            const val = cantidadProducidaPorTalla[key];
            if (typeof val !== 'number' || val < 0) {
                throw new Error('Valores negativos o no numéricos');
            }
            totalUnidadesProducidas += val;
        }

    } catch (error) {
        throw new BadRequestException(`El campo 'cantidadProducida' debe ser un JSON válido con cantidades numéricas (ej: '{"S": 20}'). Error: ${error.message}`);
    }

    // Validar contra la cantidad planificada (opcional, pero recomendado)
    if (totalUnidadesProducidas > trabajo.cantidad) {
         // Puedes lanzar error o solo advertencia según tu regla de negocio
         // throw new BadRequestException('La cantidad producida supera a la planificada'); 
    }

    const tiendaId = completarDto.tiendaId || trabajo.tiendaId; 
    
    // Validar existencia de tienda
    const tienda = await this.prisma.tienda.findUnique({ where: { id: tiendaId } });
    if (!tienda) {
        throw new NotFoundException(`Tienda con ID ${tiendaId} no encontrada`);
    }

    const productoIdProducido = trabajo.parametrosTela?.producto?.id;

    try {
        const result = await this.prisma.$transaction(async (prisma) => {
            // --- PASO 3: Actualizar el trabajo a "COMPLETADO" ---
            const updatedTrabajo = await prisma.trabajoEnProceso.update({
                where: { id },
                data: {
                    estado: 'COMPLETADO',
                    fechaFinReal: new Date()
                },
                include: { 
                    parametrosTela: { include: { producto: true, tela: true } },
                    costurero: true,
                    tienda: true
                }
            });

            // --- PASO 4: Crear el registro de TrabajoFinalizado ---
            const trabajoFinalizado = await prisma.trabajoFinalizado.create({
                data: {
                    trabajoEnProceso: { connect: { id } },
                    fechaFinalizacion: new Date(completarDto.fechaFinalizacion),
                    
                    // AQUÍ EL CAMBIO CLAVE: Guardamos el string JSON directamente
                    cantidadProducida: completarDto.cantidadProducida as unknown as string, 
                    
                    calidad: completarDto.calidad,
                    notas: completarDto.notas, // Ahora 'notas' es solo texto opcional
                    costo: completarDto.costo,
                    tienda: { connect: { id: tiendaId } }
                }
            });

            // --- PASO 5: LÓGICA DE ACTUALIZACIÓN DE INVENTARIO ---
            if (productoIdProducido) {
                // Buscar inventario existente
                const inventarioExistente = await prisma.inventarioTienda.findUnique({
                    where: { productoId_tiendaId: { productoId: productoIdProducido, tiendaId } }
                });

                const stockAnterior = (inventarioExistente?.stock as Record<string, number>) || {};
                const stockNuevo = { ...stockAnterior };

                // Sumar las nuevas cantidades al stock existente
                for (const talla in cantidadProducidaPorTalla) {
                    stockNuevo[talla] = (stockNuevo[talla] || 0) + cantidadProducidaPorTalla[talla];
                }

                // Upsert del inventario
                const inventarioActualizado = await prisma.inventarioTienda.upsert({
                    where: { productoId_tiendaId: { productoId: productoIdProducido, tiendaId } },
                    update: { stock: stockNuevo },
                    create: {
                        productoId: productoIdProducido,
                        tiendaId: tiendaId,
                        stock: stockNuevo,
                        stockMinimo: 5,
                    }
                });

                // --- PASO 6: REGISTRAR MOVIMIENTO ---
                await prisma.movimientoInventario.create({
                    data: {
                        tipo: 'ENTRADA_PRODUCCION', 
                        cantidad: cantidadProducidaPorTalla, // Guardamos el objeto JSON
                        productoId: productoIdProducido,
                        motivo: `Entrada por finalización de Trabajo #${id}`,
                        usuarioId: 1, // TODO: Obtener del usuario autenticado
                        inventarioTiendaId: inventarioActualizado.id,
                        trabajoFinalizadoId: trabajoFinalizado.id,
                        stockAnterior: stockAnterior,
                        stockNuevo: stockNuevo,
                    }
                });

            } else {
                console.warn(`Trabajo ${id} completado sin producto asociado. Inventario no afectado.`);
            }

            return { ...updatedTrabajo, trabajoFinalizado };
        });

        return new TrabajoResponseDto(result);
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                throw new ConflictException('Error al completar el trabajo: conflicto de datos único.');
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
  }async getEstadisticas(tiendaId?: number): Promise<any> {
    const where: Prisma.TrabajoEnProcesoWhereInput = {};
    if (tiendaId) {
      where.tiendaId = tiendaId;
    }

    const whereFinalizado: Prisma.TrabajoFinalizadoWhereInput = {};
    if (tiendaId) {
      whereFinalizado.tiendaId = tiendaId; 
    }

    const [
      totalTrabajos,
      trabajosPendientes,
      trabajosEnProceso,
      trabajosCompletados,
      trabajosCancelados,
      trabajosEsteMes,
      listaTrabajosFinalizados
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
      this.prisma.trabajoFinalizado.findMany({
        where: whereFinalizado,
        select: { cantidadProducida: true } 
      })
    ]);

    // --- CÁLCULO EN MEMORIA CORREGIDO ---
    let totalUnidadesProducidas = 0;

    listaTrabajosFinalizados.forEach(tf => {
      try {
        // Parseamos el string
        const json = JSON.parse(tf.cantidadProducida);
        
        if (json && typeof json === 'object') {
            // ✅ Forzamos a TS a entender que es un objeto iterable y que el resultado es un número
            const sumaIndividual: number = Object.values(json as Record<string, any>).reduce((acc: number, val: any) => {
                return acc + (Number(val) || 0);
            }, 0);
            
            totalUnidadesProducidas += sumaIndividual;
        }
      } catch (error) {
        // Ignoramos errores de parseo silenciosamente o con warn
      }
    });

    return {
      totalTrabajos,
      trabajosPendientes,
      trabajosEnProceso,
      trabajosCompletados,
      trabajosCancelados,
      trabajosEsteMes,
      totalUnidadesProducidas
    };
  }

 async getEstadisticasCumplimiento(tiendaId?: number): Promise<any> {
    const where: Prisma.TrabajoEnProcesoWhereInput = {
      estado: 'COMPLETADO',
      fechaFinReal: { not: null },
      fechaFinEstimada: { not: null }
    };

    if (tiendaId) {
      where.tiendaId = tiendaId;
    }

    const trabajosCompletados = await this.prisma.trabajoEnProceso.findMany({
      where,
      select: {
        fechaFinReal: true,
        fechaFinEstimada: true
      }
    });

    const totalEvaluados = trabajosCompletados.length;
    let aTiempo = 0;
    let conRetraso = 0;

    trabajosCompletados.forEach(trabajo => {
      // 🚨 CORRECCIÓN AQUÍ:
      // Validamos explícitamente que las fechas existan.
      // Esto satisface a TypeScript y protege contra errores en tiempo de ejecución.
      if (!trabajo.fechaFinReal || !trabajo.fechaFinEstimada) {
        return; // Saltamos esta iteración si falta algún dato (aunque la DB ya lo filtró)
      }

      // Ahora TypeScript sabe que NO son null
      const real = new Date(trabajo.fechaFinReal).getTime();
      const estimada = new Date(trabajo.fechaFinEstimada).getTime();

      if (real <= estimada) {
        aTiempo++;
      } else {
        conRetraso++;
      }
    });

    const porcentajeATiempo = totalEvaluados > 0 ? (aTiempo / totalEvaluados) * 100 : 0;
    const porcentajeRetraso = totalEvaluados > 0 ? (conRetraso / totalEvaluados) * 100 : 0;

    return {
      totalTrabajosCompletados: totalEvaluados,
      resumen: {
        aTiempo: {
          cantidad: aTiempo,
          porcentaje: parseFloat(porcentajeATiempo.toFixed(2))
        },
        conRetraso: {
          cantidad: conRetraso,
          porcentaje: parseFloat(porcentajeRetraso.toFixed(2))
        }
      },
      mensaje: porcentajeATiempo >= 80 
        ? "¡Excelente eficiencia! La mayoría de los trabajos se entregan a tiempo." 
        : "Atención: Hay un alto índice de retrasos en la producción."
    };}
}