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
    const { productoId, telaId, ...parametrosData } = createParametrosTelaDto;

    // Verificar que el código de referencia sea único
    const existing = await this.prisma.parametrosTela.findUnique({
      where: { codigoReferencia: parametrosData.codigoReferencia }
    });

    if (existing) {
      throw new ConflictException(`Ya existe un parámetro con el código de referencia '${parametrosData.codigoReferencia}'`);
    }

    // Verificar que el producto existe si se proporciona
    if (productoId) {
      const producto = await this.prisma.producto.findUnique({
        where: { id: productoId }
      });

      if (!producto) {
        throw new NotFoundException(`Producto con ID ${productoId} no encontrado`);
      }
    }

    // Verificar que la tela existe si se proporciona
    if (telaId) {
      const tela = await this.prisma.inventarioTela.findUnique({
        where: { id: telaId }
      });

      if (!tela) {
        throw new NotFoundException(`Inventario de tela  con ID ${telaId} no encontrada`);
      }
    }

    try {
      const parametros = await this.prisma.parametrosTela.create({
        data: {
          ...parametrosData,
          ...(productoId && { producto: { connect: { id: productoId } } }),
          ...(telaId && { tela: { connect: { id: telaId } } })
        },
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

      return new ParametrosTelaResponseDto(parametros);
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
    const { search, tipoTelaRecomendada, estadoPrenda, productoId, telaId, page = 1, limit = 10 } = filterParametrosTelaDto;

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
/*
  async update(id: number, updateParametrosTelaDto: UpdateParametrosTelaDto): Promise<ParametrosTelaResponseDto> {
    const parametros = await this.findOne(id);
    const { productoId, telaId, ...parametrosData } = updateParametrosTelaDto;

    try {
      const data: Prisma.ParametrosTelaUpdateInput = { ...parametrosData };

      // Verificar unicidad del código de referencia si se está cambiando
      if (parametrosData.codigoReferencia && parametrosData.codigoReferencia !== parametros.codigoReferencia) {
        const existing = await this.prisma.parametrosTela.findUnique({
          where: { codigoReferencia: parametrosData.codigoReferencia }
        });

        if (existing) {
          throw new ConflictException(`Ya existe un parámetro con el código de referencia '${parametrosData.codigoReferencia}'`);
        }
      }

      // Manejar actualización del producto
      if (productoId !== undefined) {
        if (productoId === null) {
          data.producto = { disconnect: true };
        } else if (productoId !== parametros.productoId) {
          const producto = await this.prisma.producto.findUnique({
            where: { id: productoId }
          });

          if (!producto) {
            throw new NotFoundException(`Producto con ID ${productoId} no encontrado`);
          }

          data.producto = { connect: { id: productoId } };
        }
      }

      // Manejar actualización de la tela
      if (telaId !== undefined) {
        if (telaId === null) {
          data.tela = { disconnect: true };
        } else if (telaId !== parametros.telaId) {
          const tela = await this.prisma.tela.findUnique({
            where: { id: telaId }
          });

          if (!tela) {
            throw new NotFoundException(`Tela con ID ${telaId} no encontrada`);
          }

          data.tela = { connect: { id: telaId } };
        }
      }

      const updatedParametros = await this.prisma.parametrosTela.update({
        where: { id },
        data,
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
              tipoTela: true
            }
          }
        }
      });

      return new ParametrosTelaResponseDto(updatedParametros);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Error al actualizar los parámetros de tela');
        }
      }
      throw error;
    }
  }*/

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

    const [
      totalTrabajos,
      trabajosPendientes,
      trabajosEnProceso,
      trabajosCompletados,
      totalUnidadesProducidas
    ] = await Promise.all([
      this.prisma.trabajoEnProceso.count({ where: { parametrosTelaId: id } }),
      this.prisma.trabajoEnProceso.count({ where: { parametrosTelaId: id, estado: 'PENDIENTE' } }),
      this.prisma.trabajoEnProceso.count({ where: { parametrosTelaId: id, estado: 'EN_PROCESO' } }),
      this.prisma.trabajoEnProceso.count({ where: { parametrosTelaId: id, estado: 'COMPLETADO' } }),
      this.prisma.trabajoFinalizado.aggregate({
        where: {
          trabajoEnProceso: {
            parametrosTelaId: id
          }
        },
        _sum: { cantidadProducida: true }
      })
    ]);

    return {
      parametros: new ParametrosTelaResponseDto(parametros),
      estadisticas: {
        totalTrabajos,
        trabajosPendientes,
        trabajosEnProceso,
        trabajosCompletados,
        totalUnidadesProducidas: totalUnidadesProducidas._sum.cantidadProducida || 0,
        consumoTotalTela: parseFloat((parametros.consumoTelaPorLote * (totalUnidadesProducidas._sum.cantidadProducida || 0) / parametros.cantidadEstandarPorLote).toFixed(2))
      }
    };
  }
}