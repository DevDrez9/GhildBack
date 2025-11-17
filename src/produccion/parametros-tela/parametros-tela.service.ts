import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

import { CreateParametrosTelaDto } from './dto/create-parametros-tela.dto';
import { UpdateParametrosTelaDto } from './dto/update-parametros-tela.dto';
import { FilterParametrosTelaDto } from './dto/filter-parametros-tela.dto';
import { CalculoConsumoDto } from './dto/calculo-consumo.dto';
import { ParametrosTelaResponseDto } from './dto/parametros-tela-response.dto';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from 'generated/prisma/client';

@Injectable()
export class ParametrosTelaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createParametrosTelaDto: CreateParametrosTelaDto): Promise<ParametrosTelaResponseDto> {
    const { productoId, telaId, consumoTelaPorTalla, ...parametrosData } = createParametrosTelaDto;

    // 1. Verificar unicidad del código
    const existing = await this.prisma.parametrosTela.findUnique({
      where: { codigoReferencia: parametrosData.codigoReferencia }
    });

    if (existing) {
      throw new ConflictException(`Ya existe un parámetro con el código de referencia '${parametrosData.codigoReferencia}'`);
    }

    // 2. Verificar existencia de Tela
    if (telaId) {
      const tela = await this.prisma.inventarioTela.findUnique({ where: { id: telaId } });
      if (!tela) throw new NotFoundException(`Inventario de tela con ID ${telaId} no encontrada`);
    }

    // --------------------------------------------------
    // 3. CORRECCIÓN: Parsear 'consumoTelaPorTalla' si es un string
    // --------------------------------------------------
    let tallasNuevas: string[] = [];
    let parsedConsumo: any = consumoTelaPorTalla; // 'any' ya que viene del DTO

    // 🚨 LA CORRECCIÓN 🚨
    // Verificamos si es un string (ej: '{"S": 1.5, "M": 1.8}')
    if (parsedConsumo && typeof parsedConsumo === 'string') {
        try {
            // Si es string, lo convertimos a objeto
            parsedConsumo = JSON.parse(parsedConsumo);
        } catch (e) {
            console.warn("consumoTelaPorTalla era un string pero no un JSON válido.");
            parsedConsumo = null;
        }
    }

    // Ahora que 'parsedConsumo' es un objeto, extraemos las claves
    if (parsedConsumo && typeof parsedConsumo === 'object' && !Array.isArray(parsedConsumo)) {
        tallasNuevas = Object.keys(parsedConsumo); // Esto dará ["S", "M", "L"]
    }

    try {
      // 4. Iniciar transacción
      const result = await this.prisma.$transaction(async (prisma) => {
        
        // A. Lógica de Producto y Actualización de Tallas
        if (productoId && tallasNuevas.length > 0) { // Solo si hay tallas nuevas
            const producto = await prisma.producto.findUnique({ where: { id: productoId } });
            if (!producto) throw new NotFoundException(`Producto con ID ${productoId} no encontrado`);

            const tallasActuales = producto.tallas ? producto.tallas.split(',').map(t => t.trim()) : [];
            const tallasCombinadas = Array.from(new Set([...tallasActuales, ...tallasNuevas]));
            const nuevoStringTallas = tallasCombinadas.join(',');

            if (nuevoStringTallas !== producto.tallas) {
                await prisma.producto.update({
                    where: { id: productoId },
                    data: { tallas: nuevoStringTallas } 
                });
            }
        }

        // B. Crear el registro de ParametrosTela
        const parametros = await prisma.parametrosTela.create({
          data: {
            ...parametrosData,
            // 🚨 CORRECCIÓN: Guardamos el objeto 'parsedConsumo'
            consumoTelaPorTalla: parsedConsumo || {}, 
            ...(productoId && { producto: { connect: { id: productoId } } }),
            ...(telaId && { tela: { connect: { id: telaId } } })
          },
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
                tallas: true 
              }
            },
            tela: { 
                include: {
                    tela: { 
                        select: {
                            id: true, 
                            nombreComercial: true, 
                        }
                    }
                }
            },
          }
        });

        return parametros;
      });

      return new ParametrosTelaResponseDto(result);

    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Error al crear los parámetros de tela');
        }
      }
      throw error;
    }
  }

  async findAll(filterParametrosTelaDto: FilterParametrosTelaDto = {}): Promise<{ parametros: ParametrosTelaResponseDto[], total: number }> {
    const { search, tipoTelaRecomendada, estadoPrenda, productoId, telaId, page = 1, limit = 50 } = filterParametrosTelaDto;

    const where: Prisma.ParametrosTelaWhereInput = {};

    if (tipoTelaRecomendada) where.tipoTelaRecomendada = { contains: tipoTelaRecomendada };
    if (estadoPrenda) where.estadoPrenda = estadoPrenda;
    if (productoId) where.productoId = productoId;
    if (telaId) where.telaId = telaId;

    if (search) {
      where.OR = [
        { codigoReferencia: { contains: search } },
        { nombreModelo: { contains: search } },
        { tipoTelaRecomendada: { contains: search } }
      ];
    }

    const [parametros, total] = await Promise.all([
      this.prisma.parametrosTela.findMany({
        where,
        include: {
          producto: {
            select: {
              id: true,
              nombre: true,
              sku: true
            }
          },
           tela: {
            include: {
                // ⭐ ESTO ES OBLIGATORIO ⭐
                tela: {
                    select: {
                        id: true, 
                        nombreComercial: true, 
                        // ... otros campos
                    }
                }
            }
        },
        },
        orderBy: { codigoReferencia: 'asc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      this.prisma.parametrosTela.count({ where })
    ]);

    return {
      parametros: parametros.map(param => new ParametrosTelaResponseDto(param)),
      total
    };
  }

  async findOne(id: number): Promise<ParametrosTelaResponseDto> {
    const parametros = await this.prisma.parametrosTela.findUnique({
      where: { id },
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
            include: {
                // ⭐ ESTO ES OBLIGATORIO ⭐
                tela: {
                    select: {
                        id: true, 
                        nombreComercial: true, 
                        // ... otros campos
                    }
                }
            }
        },
        trabajos: {
          include: {
            costurero: {
              select: {
                id: true,
                nombre: true,
                apellido: true
              }
            },
            tienda: {
              select: {
                id: true,
                nombre: true
              }
            }
          },
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!parametros) {
      throw new NotFoundException(`Parámetros de tela con ID ${id} no encontrados`);
    }

    return new ParametrosTelaResponseDto(parametros);
  }

  async findByCodigo(codigo: string): Promise<ParametrosTelaResponseDto> {
    const parametros = await this.prisma.parametrosTela.findUnique({
      where: { codigoReferencia: codigo },
      include: {
        producto: {
          select: {
            id: true,
            nombre: true,
            sku: true
          }
        },
         tela: {
            include: {
                // ⭐ ESTO ES OBLIGATORIO ⭐
                tela: {
                    select: {
                        id: true, 
                        nombreComercial: true, 
                        // ... otros campos
                    }
                }
            }
        },
      }
    });

    if (!parametros) {
      throw new NotFoundException(`Parámetros de tela con código '${codigo}' no encontrados`);
    }

    return new ParametrosTelaResponseDto(parametros);
  }

 async update(id: number, updateParametrosTelaDto: UpdateParametrosTelaDto): Promise<ParametrosTelaResponseDto> {
    // 1. Obtenemos el estado anterior
    const parametros = await this.prisma.parametrosTela.findUnique({ 
        where: { id },
        include: { producto: { select: { tallas: true } } } 
    });

    if (!parametros) {
        throw new NotFoundException(`Parámetro con ID ${id} no encontrado`);
    }
    
    // 2. Desestructuramos el DTO
    const { productoId, telaId, consumoTelaPorTalla, ...parametrosData } = updateParametrosTelaDto;

    // 3. Verificación de unicidad del código
    if (parametrosData.codigoReferencia && parametrosData.codigoReferencia !== parametros.codigoReferencia) {
      const existing = await this.prisma.parametrosTela.findUnique({
        where: { codigoReferencia: parametrosData.codigoReferencia }
      });
      if (existing) {
        throw new ConflictException(`Ya existe un parámetro con el código '${parametrosData.codigoReferencia}'`);
      }
    }

    try {
      // 4. Iniciamos la transacción
      const updatedParametros = await this.prisma.$transaction(async (prisma) => {
        
        // 5. Preparamos los datos base
        const data: Prisma.ParametrosTelaUpdateInput = { 
            ...parametrosData,
            // Si 'consumoTelaPorTalla' viene en el DTO, lo incluimos para actualizar
            ...(consumoTelaPorTalla && { consumoTelaPorTalla: consumoTelaPorTalla as Prisma.InputJsonValue }) 
        };

        // 6. Lógica de Tela
        if (telaId !== undefined) {
          if (telaId === null) {
            data.tela = { disconnect: true };
          } else if (telaId !== parametros.telaId) {
            const tela = await prisma.inventarioTela.findUnique({ where: { id: telaId } });
            if (!tela) throw new NotFoundException(`Inventario de tela con ID ${telaId} no encontrada`);
            data.tela = { connect: { id: telaId } };
          }
        }

        // 7. Lógica de Producto
        let finalProductoId: number | null = parametros.productoId; 

        if (productoId !== undefined) {
          if (productoId === null) {
            data.producto = { disconnect: true };
            finalProductoId = null;
          } else if (productoId !== parametros.productoId) {
            const producto = await prisma.producto.findUnique({ where: { id: productoId } });
            if (!producto) throw new NotFoundException(`Producto con ID ${productoId} no encontrado`);
            data.producto = { connect: { id: productoId } };
            finalProductoId = productoId;
          }
        }

        // --------------------------------------------------
        // 8. LÓGICA CORREGIDA PARA ACTUALIZAR 'tallas'
        // --------------------------------------------------
        if (consumoTelaPorTalla && finalProductoId) {
          
          let tallasNuevas: string[] = [];
          let parsedConsumo: any = consumoTelaPorTalla;

          // 🚨 LA CORRECCIÓN 🚨
          // Verificamos si es un string (porque el DTO lo pasa como 'any' o 'string')
          if (typeof parsedConsumo === 'string') {
            try {
              // Si es string, lo convertimos a objeto
              parsedConsumo = JSON.parse(parsedConsumo);
            } catch (e) {
              // Si falla el parseo (es un string inválido), lo dejamos como null
              console.warn("El campo consumoTelaPorTalla no era un JSON válido.");
              parsedConsumo = null;
            }
          }

          // Si (después de parsear) es un objeto válido, extraemos sus claves
          if (parsedConsumo && typeof parsedConsumo === 'object' && !Array.isArray(parsedConsumo)) {
            tallasNuevas = Object.keys(parsedConsumo); // Esto dará ["XL"]
          }

          if (tallasNuevas.length > 0) {
            const producto = await prisma.producto.findUnique({ where: { id: finalProductoId } });
            
            if (producto) {
              const tallasActuales = producto.tallas ? producto.tallas.split(',').map(t => t.trim()) : [];
              const tallasCombinadas = Array.from(new Set([...tallasActuales, ...tallasNuevas]));
              const nuevoStringTallas = tallasCombinadas.join(',');

              if (nuevoStringTallas !== producto.tallas) {
                await prisma.producto.update({
                  where: { id: finalProductoId },
                  data: { tallas: nuevoStringTallas }
                });
              }
            }
          }
        }

        // 9. Actualizar ParametrosTela
        return prisma.parametrosTela.update({
          where: { id },
          data,
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
                tallas: true 
              }
            },
            tela:{
              include: {
                tela:true
              }
            }
          }
        });
      }); // Fin de la transacción

      return new ParametrosTelaResponseDto(updatedParametros);

    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Error al actualizar los parámetros de tela');
        }
      }
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    const parametros = await this.findOne(id);

    // Verificar si hay trabajos asociados
    const totalTrabajos = await this.prisma.trabajoEnProceso.count({
      where: { parametrosTelaId: id }
    });

    if (totalTrabajos > 0) {
      throw new ConflictException('No se pueden eliminar parámetros que tienen trabajos asociados');
    }

    await this.prisma.parametrosTela.delete({
      where: { id }
    });
  }

  async getTrabajos(id: number): Promise<any> {
    const parametros = await this.findOne(id);

    const trabajos = await this.prisma.trabajoEnProceso.findMany({
      where: { parametrosTelaId: id },
      include: {
        costurero: {
          select: {
            id: true,
            nombre: true,
            apellido: true
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
      orderBy: { createdAt: 'desc' }
    });

    return trabajos;
  }

  async calcularConsumo(id: number, calculoDto: CalculoConsumoDto): Promise<any> {
    const parametros = await this.findOne(id);
    const { cantidad, talla, multiplicador = 1 } = calculoDto;

    let consumoTotal = 0;

    if (talla && parametros.consumoTelaPorTalla) {
      // Calcular por talla específica
      const consumoPorTalla = parametros.consumoTelaPorTalla[talla];
      if (!consumoPorTalla) {
        throw new BadRequestException(`Talla '${talla}' no encontrada en los parámetros`);
      }
      consumoTotal = consumoPorTalla * (cantidad || 1) * multiplicador;
    } else if (cantidad) {
      // Calcular por cantidad de unidades
      consumoTotal = parametros.consumoTelaPorLote * (cantidad / parametros.cantidadEstandarPorLote) * multiplicador;
    } else {
      // Devolver consumo estándar por lote
      consumoTotal = parametros.consumoTelaPorLote * multiplicador;
    }

    const tiempoTotal = parametros.tiempoTotalPorLote * (cantidad ? cantidad / parametros.cantidadEstandarPorLote : 1) * multiplicador;

    return {
      parametros: new ParametrosTelaResponseDto(parametros),
      calculo: {
        cantidad: cantidad || parametros.cantidadEstandarPorLote,
        talla: talla || 'Estándar',
        multiplicador,
        consumoTotal: parseFloat(consumoTotal.toFixed(2)),
        tiempoTotal: parseFloat(tiempoTotal.toFixed(2)),
        unidadesPorLote: parametros.cantidadEstandarPorLote
      }
    };
  }
async getEstadisticas(id: number): Promise<any> {
    const parametros = await this.findOne(id);

    // 1. Consultas en paralelo
    // Traemos la lista de trabajos finalizados para sumar el JSON en memoria
    const [
      totalTrabajos,
      trabajosPendientes,
      trabajosEnProceso,
      trabajosCompletados,
      trabajosFinalizadosLista // <-- CAMBIO: Traemos la lista, no el agregado
    ] = await Promise.all([
      this.prisma.trabajoEnProceso.count({ where: { parametrosTelaId: id } }),
      this.prisma.trabajoEnProceso.count({ where: { parametrosTelaId: id, estado: 'PENDIENTE' } }),
      this.prisma.trabajoEnProceso.count({ where: { parametrosTelaId: id, estado: 'EN_PROCESO' } }),
      this.prisma.trabajoEnProceso.count({ where: { parametrosTelaId: id, estado: 'COMPLETADO' } }),
      this.prisma.trabajoFinalizado.findMany({
        where: {
          trabajoEnProceso: {
            parametrosTelaId: id
          }
        },
        select: { cantidadProducida: true } // Solo traemos el campo necesario
      })
    ]);

    // 2. Calcular Total de Unidades Producidas (Sumando los JSONs)
    let totalUnidadesProducidas = 0;

    trabajosFinalizadosLista.forEach(tf => {
      try {
        const json = JSON.parse(tf.cantidadProducida);
        if (json && typeof json === 'object') {
            // Sumar valores del objeto {"S": 10, "M": 5} -> 15
            const sumaRegistro = Object.values(json as Record<string, any>).reduce((acc: number, val: any) => {
                return acc + (Number(val) || 0);
            }, 0);
            totalUnidadesProducidas += sumaRegistro;
        }
      } catch (e) {
        // Fallback si no es JSON válido
        totalUnidadesProducidas += Number(tf.cantidadProducida) || 0;
      }
    });

    // 3. Calcular Consumo Total de Tela
    // Fórmula: (Consumo por Lote * Total Unidades Producidas) / Cantidad Estándar por Lote
    // Validamos división por cero para evitar NaN o Infinity
    let consumoTotalTela = 0;
    if (parametros.cantidadEstandarPorLote > 0) {
        consumoTotalTela = (parametros.consumoTelaPorLote * totalUnidadesProducidas) / parametros.cantidadEstandarPorLote;
    }

    return {
      parametros: new ParametrosTelaResponseDto(parametros),
      estadisticas: {
        totalTrabajos,
        trabajosPendientes,
        trabajosEnProceso,
        trabajosCompletados,
        totalUnidadesProducidas, // Valor calculado en memoria
        consumoTotalTela: parseFloat(consumoTotalTela.toFixed(2))
      }
    };
  }
}