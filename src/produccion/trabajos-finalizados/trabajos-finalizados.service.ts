import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

import { UpdateCalidadDto } from './dto/update-calidad.dto';

import { TrabajoFinalizadoResponseDto } from './dto/trabajo-finalizado-response.dto';
import { PrismaService } from 'src/prisma.service';
import { FilterTrabajoFinalizadoDto } from './dto/create-trabajos-finalizado.dto';
import { Prisma, TipoMovimiento } from 'generated/prisma/client';
import { TrabajoAgregadoResponseDto } from './dto/trabajo-agregado-response.dto';


@Injectable()
export class TrabajosFinalizadosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filterTrabajoFinalizadoDto: FilterTrabajoFinalizadoDto = {}): Promise<{ trabajos: TrabajoFinalizadoResponseDto[], total: number }> {
    const {
      search,
      calidad,
      costureroId,
      parametrosTelaId,
      tiendaId,
      fechaDesde,
      fechaHasta,
      page = 1,
      limit = 10
    } = filterTrabajoFinalizadoDto;

    const where: Prisma.TrabajoFinalizadoWhereInput = {};

    if (calidad) where.calidad = calidad;
    if (tiendaId) where.tiendaId = tiendaId;

    // Filtros por fechas
    if (fechaDesde || fechaHasta) {
      where.fechaFinalizacion = {};
      if (fechaDesde) where.fechaFinalizacion.gte = new Date(fechaDesde);
      if (fechaHasta) {
        const fechaHastaDate = new Date(fechaHasta);
        fechaHastaDate.setHours(23, 59, 59, 999);
        where.fechaFinalizacion.lte = fechaHastaDate;
      }
    }

    // Filtros por relaciones
    if (costureroId || parametrosTelaId || search) {
      where.trabajoEnProceso = {};
      
      if (costureroId) {
        where.trabajoEnProceso.costureroId = costureroId;
      }
      
      if (parametrosTelaId) {
        where.trabajoEnProceso.parametrosTelaId = parametrosTelaId;
      }
      
      if (search) {
        where.trabajoEnProceso.OR = [
          { codigoTrabajo: { contains: search} },
          {
            parametrosTela: {
              OR: [
                { codigoReferencia: { contains: search} },
                { nombreModelo: { contains: search } }
              ]
            }
          }
        ];
      }
    }

    const [trabajos, total] = await Promise.all([
      this.prisma.trabajoFinalizado.findMany({
        where,
        include: {
          trabajoEnProceso: {
            
            include: {
              
              parametrosTela: {
                include: {
                  producto: {
                    select: {
                      id: true,
                      nombre: true,
                      sku: true,
                      imagenes: true
                    }
                  }
                }
              },
              costurero: {
                select: {
                  id: true,
                  nombre: true,
                  apellido: true
                }
              }
            }
          },
          tienda: {
            select: {
              id: true,
              nombre: true
            }
          },
          movimientosInventario: {
            take: 5,
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { fechaFinalizacion: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      this.prisma.trabajoFinalizado.count({ where })
    ]);

    return {
      trabajos: trabajos.map(trabajo => new TrabajoFinalizadoResponseDto(trabajo)),
      total
    };
  }

  async findOne(id: number): Promise<TrabajoFinalizadoResponseDto> {
    const trabajo = await this.prisma.trabajoFinalizado.findUnique({
      where: { id },
      include: {
        trabajoEnProceso: {
          include: {
            parametrosTela: {
              include: {
                producto: {
                  select: {
                    id: true,
                    nombre: true,
                    sku: true,
                    imagenes: true,
                    categoria: {
                      select: {
                        id: true,
                        nombre: true
                      }
                    }
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
                telefono: true,
                email: true
              }
            },
            tienda: {
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
            nombre: true,
            dominio: true
          }
        },
        movimientosInventario: {
          include: {
            usuario: {
              select: {
                id: true,
                nombre: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!trabajo) {
      throw new NotFoundException(`Trabajo finalizado con ID ${id} no encontrado`);
    }

    return new TrabajoFinalizadoResponseDto(trabajo);
  }

  async findByTrabajo(trabajoId: number): Promise<TrabajoFinalizadoResponseDto> {
    const trabajo = await this.prisma.trabajoFinalizado.findUnique({
      where: { trabajoEnProcesoId: trabajoId },
      include: {
        trabajoEnProceso: {
          include: {
            parametrosTela: {
              include: {
                producto: {
                  select: {
                    id: true,
                    nombre: true,
                    sku: true,
                    imagenes: true
                  }
                }
              }
            },
            costurero: {
              select: {
                id: true,
                nombre: true,
                apellido: true
              }
            }
          }
        },
        tienda: {
          select: {
            id: true,
            nombre: true
          }
        },
        movimientosInventario: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!trabajo) {
      throw new NotFoundException(`No se encontró trabajo finalizado para el trabajo con ID ${trabajoId}`);
    }

    return new TrabajoFinalizadoResponseDto(trabajo);
  }

  async updateCalidad(id: number, updateCalidadDto: UpdateCalidadDto): Promise<TrabajoFinalizadoResponseDto> {
    const trabajo = await this.findOne(id);

    const updatedTrabajo = await this.prisma.trabajoFinalizado.update({
      where: { id },
      data: {
        calidad: updateCalidadDto.calidad,
        notas: updateCalidadDto.notas ? 
          (trabajo.notas ? `${trabajo.notas} | ${updateCalidadDto.notas}` : updateCalidadDto.notas) 
          : trabajo.notas
      },
      include: {
        trabajoEnProceso: {
          include: {
            parametrosTela: {
              include: {
                producto: {
                  select: {
                    id: true,
                    nombre: true,
                    sku: true,
                    imagenes: true
                  }
                }
              }
            },
            costurero: {
              select: {
                id: true,
                nombre: true,
                apellido: true
              }
            }
          }
        },
        tienda: {
          select: {
            id: true,
            nombre: true
          }
        },
        movimientosInventario: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    return new TrabajoFinalizadoResponseDto(updatedTrabajo);
  }async registrarEnInventario(id: number): Promise<TrabajoFinalizadoResponseDto> {
    // 1. Obtener el trabajo finalizado
    const trabajo = await this.prisma.trabajoFinalizado.findUnique({
      where: { id },
      include: {
        trabajoEnProceso: {
          include: {
            parametrosTela: {
              include: { producto: true }
            }
          }
        }
      }
    });

    if (!trabajo) {
      throw new NotFoundException(`Trabajo finalizado con ID ${id} no encontrado`);
    }

    // 2. Validar si ya se registró en inventario (Evitar duplicados)
    const totalMovimientos = await this.prisma.movimientoInventario.count({
      where: { trabajoFinalizadoId: id }
    });

    if (totalMovimientos > 0) {
      throw new ConflictException('Este trabajo ya fue registrado en el inventario');
    }

    // 3. Validar que tenga producto asociado
    if (!trabajo.trabajoEnProceso?.parametrosTela?.producto) {
      throw new BadRequestException('El trabajo no tiene un producto asociado para registrar en inventario');
    }

    const productoId = trabajo.trabajoEnProceso.parametrosTela.producto.id;
    const tiendaId = trabajo.tiendaId;

    // -------------------------------------------------------
    // 4. PARSEAR EL JSON DESDE 'cantidadProducida'
    // -------------------------------------------------------
    let cantidadPorTalla: Record<string, number>;
    
    try {
      // Asumimos que cantidadProducida es un string tipo '{"S": 10, "M": 5}'
      cantidadPorTalla = JSON.parse(trabajo.cantidadProducida);
      
      // Validación extra: Debe ser un objeto y no null
      if (typeof cantidadPorTalla !== 'object' || cantidadPorTalla === null) {
        throw new Error('Formato JSON inválido');
      }
    } catch (e) {
      throw new BadRequestException(`El campo 'cantidadProducida' no contiene un JSON válido. Valor actual: ${trabajo.cantidadProducida}`);
    }

    try {
      const result = await this.prisma.$transaction(async (prisma) => {
        
        // --- A. GESTIÓN DEL INVENTARIO (Upsert) ---
        
        // Buscar inventario existente para obtener el stock actual
        const inventarioExistente = await prisma.inventarioTienda.findUnique({
          where: {
            productoId_tiendaId: { productoId, tiendaId }
          }
        });

        // Obtener el objeto de stock actual (o vacío si es nuevo)
        const stockAnterior = (inventarioExistente?.stock as Record<string, number>) || {};
        const stockNuevo = { ...stockAnterior };

        // Sumar las cantidades del JSON procesado al stock existente
        for (const talla in cantidadPorTalla) {
          // Aseguramos que sea tratado como número
          const cantidad = Number(cantidadPorTalla[talla]) || 0;
          stockNuevo[talla] = (stockNuevo[talla] || 0) + cantidad;
        }

        // Guardar el nuevo stock (JSON) usando upsert
        const inventarioActualizado = await prisma.inventarioTienda.upsert({
          where: {
            productoId_tiendaId: { productoId, tiendaId }
          },
          update: {
            stock: stockNuevo
          },
          create: {
            productoId,
            tiendaId,
            stock: stockNuevo,
            stockMinimo: 5 // Valor por defecto
          }
        });

        // --- B. CREAR MOVIMIENTO ---
        await prisma.movimientoInventario.create({
          data: {
            tipo: 'ENTRADA_PRODUCCION', // Asegúrate que coincide con tu Enum (puede ser ENTRADA_PRODUCCION)
            cantidad: cantidadPorTalla, // Guardamos el JSON del desglose que acabamos de parsear
            productoId,
            motivo: `Producción terminada - Trabajo ${trabajo.trabajoEnProceso.codigoTrabajo}`,
            trabajoFinalizadoId: id,
            inventarioTiendaId: inventarioActualizado.id,
            stockAnterior: stockAnterior,
            stockNuevo: stockNuevo
          }
        });

        // --- C. RETORNAR RESULTADO COMPLETO ---
        
        // Recuperar el objeto completo con todas las relaciones necesarias para el DTO
        const trabajoFinalizadoCompleto = await prisma.trabajoFinalizado.findUnique({
          where: { id },
          include: {
            trabajoEnProceso: {
              include: {
                parametrosTela: {
                  include: {
                    producto: {
                      select: {
                        id: true,
                        nombre: true,
                        sku: true,
                        imagenes: true
                      }
                    }
                  }
                },
                costurero: {
                   select: { id: true, nombre: true, apellido: true }
                }
              }
            },
            tienda: {
              select: { id: true, nombre: true }
            },
            movimientosInventario: { // Verifica que este nombre coincida con tu schema (puede ser 'movimientoInventario' en singular)
              include: {
                usuario: { select: { id: true, nombre: true, email: true } }
              },
              orderBy: { createdAt: 'desc' }
            }
          }
        });

        // Validación de seguridad para TypeScript
        if (!trabajoFinalizadoCompleto) {
            throw new NotFoundException(`Error al recuperar el trabajo finalizado ${id} después de la transacción.`);
        }

        return trabajoFinalizadoCompleto;
      });

      return new TrabajoFinalizadoResponseDto(result);

    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Error de conflicto al registrar en inventario (P2002)');
        }
      }
      throw error;
    }
  }
 async getEstadisticas(tiendaId?: number): Promise<any> {
    const where: Prisma.TrabajoFinalizadoWhereInput = {};
    
    if (tiendaId) {
      where.tiendaId = tiendaId;
    }

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);

    const [
      totalTrabajos,
      calidadExcelente,
      calidadBuena,
      calidadRegular,
      calidadDefectuoso,
      todosLosTrabajos 
    ] = await Promise.all([
      this.prisma.trabajoFinalizado.count({ where }),
      this.prisma.trabajoFinalizado.count({ where: { ...where, calidad: 'EXCELENTE' } }),
      this.prisma.trabajoFinalizado.count({ where: { ...where, calidad: 'BUENA' } }),
      this.prisma.trabajoFinalizado.count({ where: { ...where, calidad: 'REGULAR' } }),
      this.prisma.trabajoFinalizado.count({ where: { ...where, calidad: 'DEFECTUOSO' } }),
      this.prisma.trabajoFinalizado.findMany({
        where,
        select: {
          cantidadProducida: true,
          fechaFinalizacion: true
        }
      })
    ]);

    // --- CÁLCULOS EN MEMORIA ---
    let totalUnidades = 0;
    let produccionMes = 0;
    let produccionSemana = 0;

    todosLosTrabajos.forEach(trabajo => {
      let cantidadTotalRegistro = 0;
      try {
        const json = JSON.parse(trabajo.cantidadProducida);
        if (json && typeof json === 'object') {
          // 💡 CORRECCIÓN AQUÍ:
          // 1. Casteamos 'json' como Record<string, any> para que Object.values funcione.
          // 2. Tipamos 'val' como 'any' para permitir la conversión a Number().
          cantidadTotalRegistro = Object.values(json as Record<string, any>).reduce((acc: number, val: any) => {
             return acc + (Number(val) || 0);
          }, 0);
        }
      } catch (e) {
        cantidadTotalRegistro = Number(trabajo.cantidadProducida) || 0;
      }

      totalUnidades += cantidadTotalRegistro;

      if (trabajo.fechaFinalizacion >= startOfMonth) {
        produccionMes += cantidadTotalRegistro;
      }
      if (trabajo.fechaFinalizacion >= startOfWeek) {
        produccionSemana += cantidadTotalRegistro;
      }
    });

    const porcentajeCalidad = {
      EXCELENTE: totalTrabajos > 0 ? (calidadExcelente / totalTrabajos) * 100 : 0,
      BUENA: totalTrabajos > 0 ? (calidadBuena / totalTrabajos) * 100 : 0,
      REGULAR: totalTrabajos > 0 ? (calidadRegular / totalTrabajos) * 100 : 0,
      DEFECTUOSO: totalTrabajos > 0 ? (calidadDefectuoso / totalTrabajos) * 100 : 0
    };

    return {
      totalTrabajos,
      totalUnidadesProducidas: totalUnidades,
      calidad: porcentajeCalidad,
      produccionEsteMes: produccionMes,
      produccionSemanaActual: produccionSemana,
      promedioUnidadesPorTrabajo: totalTrabajos > 0 ? totalUnidades / totalTrabajos : 0
    };
  }async getProduccionPorParametros(tiendaId?: number): Promise<any> {
    const where: Prisma.TrabajoFinalizadoWhereInput = {};
  
    if (tiendaId) {
      where.tiendaId = tiendaId; 
    }

    const trabajos = await this.prisma.trabajoFinalizado.findMany({
      where,
      include: {
        trabajoEnProceso: {
          include: {
            parametrosTela: {
              include: {
                producto: {
                  select: {
                    id: true,
                    nombre: true,
                    imagenes: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // 2. Agrupar y Sumar en Memoria
    const agrupado = new Map<number, any>();

    trabajos.forEach(tf => {
      const params = tf.trabajoEnProceso?.parametrosTela;
      if (!params) return;

      const key = params.id;

      // Calcular cantidad numérica del JSON
      let cantidadNumerica = 0;
      try {
        const json = JSON.parse(tf.cantidadProducida);
        // 💡 CORRECCIÓN AQUÍ TAMBIÉN:
        if (json && typeof json === 'object') {
            cantidadNumerica = Object.values(json as Record<string, any>).reduce((acc: number, val: any) => {
                return acc + (Number(val) || 0);
            }, 0);
        }
      } catch (e) {
        cantidadNumerica = 0;
      }

      if (!agrupado.has(key)) {
        agrupado.set(key, {
          parametrosTelaId: params.id,
          codigoReferencia: params.codigoReferencia,
          nombreModelo: params.nombreModelo,
          producto: params.producto || null,
          totalTrabajos: 0,
          totalUnidades: 0
        });
      }

      const item = agrupado.get(key);
      item.totalTrabajos += 1;
      item.totalUnidades += cantidadNumerica;
    });

    const resultado = Array.from(agrupado.values())
      .sort((a, b) => b.totalUnidades - a.totalUnidades) 
      .slice(0, 10); 

    return resultado;
  }
  async remove(id: number): Promise<void> {
    const trabajo = await this.findOne(id);

    // Verificar si tiene movimientos de inventario
    const totalMovimientos = await this.prisma.movimientoInventario.count({
      where: { trabajoFinalizadoId: id }
    });

    if (totalMovimientos > 0) {
      throw new ConflictException('No se puede eliminar un trabajo finalizado que tiene movimientos de inventario asociados');
    }

    await this.prisma.trabajoFinalizado.delete({
      where: { id }
    });
  }
async getAgregadoPorProducto(
        productoId: number,
        tiendaId?: number
    ): Promise<TrabajoAgregadoResponseDto> {

        // 1. Verificar existencia del producto
        const producto = await this.prisma.producto.findUnique({
            where: { id: productoId },
            select: { nombre: true, id: true }
        });

        if (!producto) {
            throw new NotFoundException(`Producto con ID ${productoId} no encontrado`);
        }

        // 2. Traer los trabajos finalizados relacionados con este producto
        // Ya no usamos SQL crudo complejo, usamos la API de Prisma que es más segura y limpia.
        const trabajos = await this.prisma.trabajoFinalizado.findMany({
            where: {
                // Filtro por Tienda (si existe)
                ...(tiendaId ? { tiendaId: tiendaId } : {}),
                // Filtro por Producto (a través de las relaciones)
                trabajoEnProceso: {
                    parametrosTela: {
                        productoId: productoId
                    }
                }
            },
            select: {
                cantidadProducida: true, // Traemos el string JSON
                costo: true              // Traemos el costo numérico
            }
        });

        // 3. Calcular Totales en Memoria
        let totalCantidadProducida = 0;
        let totalCosto = 0;

        trabajos.forEach(trabajo => {
            // A. Sumar Costo (simple)
            // Convertimos Decimal a number si es necesario (depende de tu config de Prisma)
            const costoNumerico = Number(trabajo.costo) || 0;
            totalCosto += costoNumerico;

            // B. Sumar Cantidad (parseando el JSON)
            try {
                // Intentamos parsear: '{"S": 10, "M": 5}'
                const json = JSON.parse(trabajo.cantidadProducida);
                
                if (json && typeof json === 'object') {
                    // Sumamos los valores del objeto: 10 + 5 = 15
                    const cantidadRegistro = Object.values(json as Record<string, any>).reduce((acc: number, val: any) => {
                        return acc + (Number(val) || 0);
                    }, 0);
                    
                    totalCantidadProducida += cantidadRegistro;
                }
            } catch (e) {
                // Fallback: Si por alguna razón antigua el dato es un número simple en el string
                totalCantidadProducida += Number(trabajo.cantidadProducida) || 0;
            }
        });

        // 4. Retornar DTO
        return new TrabajoAgregadoResponseDto({
            productoId: producto.id,
            nombreProducto: producto.nombre,
            totalCosto: totalCosto, // Total acumulado
            totalCantidadProducida: totalCantidadProducida, // Total acumulado del parseo
        });
    }


    
}