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
                      sku: true
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
                    sku: true
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
                    sku: true
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
  }

  async registrarEnInventario(id: number): Promise<TrabajoFinalizadoResponseDto> {
    const trabajo = await this.findOne(id);

    // Verificar si ya tiene movimientos de inventario
    const totalMovimientos = await this.prisma.movimientoInventario.count({
      where: { trabajoFinalizadoId: id }
    });

    if (totalMovimientos > 0) {
      throw new ConflictException('Este trabajo ya fue registrado en el inventario');
    }

    // Verificar que el trabajo tenga producto asociado
    if (!trabajo.trabajoEnProceso?.parametrosTela?.producto) {
      throw new BadRequestException('El trabajo no tiene un producto asociado para registrar en inventario');
    }

    const productoId = trabajo.trabajoEnProceso.parametrosTela.producto.id;
    const tiendaId = trabajo.tiendaId;
    const cantidad = trabajo.cantidadProducida;

    try {
      const result = await this.prisma.$transaction(async (prisma) => {
        // Buscar inventario existente
        const inventarioExistente = await prisma.inventarioTienda.findUnique({
          where: {
            productoId_tiendaId: {
              productoId,
              tiendaId
            }
          }
        });

        let stockAnterior = 0;
        let stockNuevo = cantidad;

        if (inventarioExistente) {
          stockAnterior = inventarioExistente.stock;
          stockNuevo = stockAnterior + cantidad;

          // Actualizar inventario existente
          await prisma.inventarioTienda.update({
            where: {
              productoId_tiendaId: {
                productoId,
                tiendaId
              }
            },
            data: {
              stock: { increment: cantidad }
            }
          });
        } else {
          // Crear nuevo registro de inventario
          await prisma.inventarioTienda.create({
            data: {
              productoId,
              tiendaId,
              stock: cantidad,
              stockMinimo: 5
            }
          });
        }

        // Crear movimiento de inventario
        const movimiento = await prisma.movimientoInventario.create({
          data: {
            tipo: TipoMovimiento.ENTRADA_PRODUCCION,
            cantidad,
            productoId,
            motivo: `Producción terminada - Trabajo ${trabajo.trabajoEnProceso.codigoTrabajo}`,
            trabajoFinalizadoId: id,
            inventarioTiendaId: tiendaId,
            stockAnterior,
            stockNuevo
          },
          include: {
            usuario: {
              select: {
                id: true,
                nombre: true,
                email: true
              }
            }
          }
        });

        // Actualizar el trabajo finalizado con la referencia al movimiento
        const updatedTrabajo = await prisma.trabajoFinalizado.update({
          where: { id },
          data: {
            movimientosInventario: {
              connect: { id: movimiento.id }
            }
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
                        sku: true
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

        return updatedTrabajo;
      });

      return new TrabajoFinalizadoResponseDto(result);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Error al registrar en inventario');
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

    const [
      totalTrabajos,
      totalUnidadesProducidas,
      calidadExcelente,
      calidadBuena,
      calidadRegular,
      calidadDefectuoso,
      produccionEsteMes,
      produccionSemanaActual
    ] = await Promise.all([
      this.prisma.trabajoFinalizado.count({ where }),
      this.prisma.trabajoFinalizado.aggregate({
        where,
        _sum: { cantidadProducida: true }
      }),
      this.prisma.trabajoFinalizado.count({ where: { ...where, calidad: 'EXCELENTE' } }),
      this.prisma.trabajoFinalizado.count({ where: { ...where, calidad: 'BUENA' } }),
      this.prisma.trabajoFinalizado.count({ where: { ...where, calidad: 'REGULAR' } }),
      this.prisma.trabajoFinalizado.count({ where: { ...where, calidad: 'DEFECTUOSO' } }),
      this.prisma.trabajoFinalizado.aggregate({
        where: {
          ...where,
          fechaFinalizacion: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        },
        _sum: { cantidadProducida: true }
      }),
      this.prisma.trabajoFinalizado.aggregate({
        where: {
          ...where,
          fechaFinalizacion: {
            gte: new Date(new Date().setDate(new Date().getDate() - 7))
          }
        },
        _sum: { cantidadProducida: true }
      })
    ]);

    const total = totalUnidadesProducidas._sum.cantidadProducida || 0;
    const porcentajeCalidad = {
      EXCELENTE: totalTrabajos > 0 ? (calidadExcelente / totalTrabajos) * 100 : 0,
      BUENA: totalTrabajos > 0 ? (calidadBuena / totalTrabajos) * 100 : 0,
      REGULAR: totalTrabajos > 0 ? (calidadRegular / totalTrabajos) * 100 : 0,
      DEFECTUOSO: totalTrabajos > 0 ? (calidadDefectuoso / totalTrabajos) * 100 : 0
    };

    return {
      totalTrabajos,
      totalUnidadesProducidas: total,
      calidad: porcentajeCalidad,
      produccionEsteMes: produccionEsteMes._sum.cantidadProducida || 0,
      produccionSemanaActual: produccionSemanaActual._sum.cantidadProducida || 0,
      promedioUnidadesPorTrabajo: totalTrabajos > 0 ? total / totalTrabajos : 0
    };
  }

  async getProduccionPorParametros(tiendaId?: number): Promise<any> {
  const where: Prisma.TrabajoFinalizadoWhereInput = {};
  
  if (tiendaId) {
    where.trabajoEnProceso = { tiendaId };
  }

  const produccion = await this.prisma.trabajoFinalizado.groupBy({
    by: ['trabajoEnProcesoId'],
    where,
    _sum: {
      cantidadProducida: true
    },
    _count: {
      id: true
    },
    orderBy: {
      _sum: {
        cantidadProducida: 'desc'
      }
    },
    take: 10
  });

  // Obtener detalles de los parámetros de tela
  const produccionConDetalles = await Promise.all(
    produccion.map(async (item) => {
      const trabajo = await this.prisma.trabajoFinalizado.findUnique({
        where: { id: item.trabajoEnProcesoId },
        include: {
          trabajoEnProceso: {
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
            }
          }
        }
      });

      // Verificar que todo exista antes de acceder a las propiedades
      if (!trabajo || !trabajo.trabajoEnProceso || !trabajo.trabajoEnProceso.parametrosTela) {
        return null; // O manejar el caso de error apropiadamente
      }

      return {
        parametrosTelaId: trabajo.trabajoEnProceso.parametrosTela.id,
        codigoReferencia: trabajo.trabajoEnProceso.parametrosTela.codigoReferencia,
        nombreModelo: trabajo.trabajoEnProceso.parametrosTela.nombreModelo,
        producto: trabajo.trabajoEnProceso.parametrosTela.producto || null,
        totalTrabajos: item._count.id,
        totalUnidades: item._sum.cantidadProducida || 0
      };
    })
  );

  // Filtrar resultados nulos
  return produccionConDetalles.filter(item => item !== null);
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

        // 1. Verificar la existencia del producto y obtener su nombre
        const producto = await this.prisma.producto.findUnique({
            where: { id: productoId },
            select: { nombre: true, id: true }
        });

        if (!producto) {
            throw new NotFoundException(`Producto con ID ${productoId} no encontrado`);
        }
        
        // 2. Definir el filtro WHERE de SQL (tiendaId es opcional)
        const tiendaFilter = tiendaId 
            ? Prisma.sql`AND tf.\`tiendaId\` = ${tiendaId}` // Usar acentos graves para MySQL
            : Prisma.empty;

        // 3. ⭐ CONSULTA CRUDA (SQL) con JOINs para la agregación ⭐
        // La ruta de JOINs es: TrabajoFinalizado -> TrabajoEnProceso -> ParametrosTela -> Producto
       const resultadoRaw = await this.prisma.$queryRaw<{
        total_costo: string, 
        total_cantidad: bigint
    }[]>(Prisma.sql`
        SELECT
            SUM(tf.\`cantidadProducida\`) AS total_cantidad,
            -- CLAVE: Sumamos directamente el costo de la producción, usando COALESCE para tratar NULL como 0
            CAST(
                SUM(COALESCE(tf.\`costo\`, 0))
                AS CHAR) AS total_costo -- Forzamos a CHAR
        FROM \`TrabajoFinalizado\` tf
        JOIN \`TrabajoEnProceso\` tep ON tep.id = tf.\`trabajoEnProcesoId\`
        JOIN \`ParametrosTela\` pt ON pt.id = tep.\`parametrosTelaId\`
        WHERE 
            pt.\`productoId\` = ${productoId}
            ${tiendaFilter}
    `);

        const resultado = resultadoRaw[0];

        // 4. Mapear y convertir los resultados
        const totalCosto = resultado.total_costo ? parseFloat(resultado.total_costo) : 0;
        const totalCantidadProducida = resultado.total_cantidad ? Number(resultado.total_cantidad) : 0;

        return new TrabajoAgregadoResponseDto({
            productoId: producto.id,
            nombreProducto: producto.nombre,
            totalCosto: totalCosto,
            totalCantidadProducida: totalCantidadProducida,
        });
    }
}