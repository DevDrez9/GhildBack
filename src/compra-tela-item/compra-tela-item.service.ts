import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';

import { CreateCompraTelaItemDto } from './dto/create-compra-tela-item.dto';
import { UpdateCompraTelaItemDto } from './dto/update-compra-tela-item.dto';
import { CompraTelaItemResponseDto } from './dto/compra-tela-item-response.dto';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from 'generated/prisma/client';
import { Decimal } from 'generated/prisma/runtime/library';
import { DecimalUtil } from 'src/utils/decimal.util';


const decimalToNumber = (value: any): number => {
  if (value instanceof Decimal) {
    return value.toNumber();
  }
  return Number(value) || 0;
};

@Injectable()
export class CompraTelaItemService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCompraTelaItemDto: CreateCompraTelaItemDto): Promise<CompraTelaItemResponseDto> {
    const { telaId, compraId, ...itemData } = createCompraTelaItemDto;

    // Verificar que la tela existe
    const tela = await this.prisma.tela.findUnique({
      where: { id: telaId }
    });

    if (!tela) {
      throw new NotFoundException(`Tela con ID ${telaId} no encontrada`);
    }

    // Verificar que la compra existe
    const compra = await this.prisma.compraProveedor.findUnique({
      where: { id: compraId }
    });

    if (!compra) {
      throw new NotFoundException(`Compra con ID ${compraId} no encontrada`);
    }

    try {
      const compraTelaItem = await this.prisma.compraTelaItem.create({
        data: {
          ...itemData,
          tela: { connect: { id: telaId } },
          compra: { connect: { id: compraId } }
        },
        include: {
          tela: {
            include: {
              proveedor: true
            }
          },
          compra: true
        }
      });

      return new CompraTelaItemResponseDto(compraTelaItem);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Error al crear el item de compra de tela');
        }
      }
      throw error;
    }
  }

  async findAll(compraId?: number, telaId?: number): Promise<CompraTelaItemResponseDto[]> {
    const where: Prisma.CompraTelaItemWhereInput = {};

    if (compraId) where.compraId = compraId;
    if (telaId) where.telaId = telaId;

    const compraTelaItems = await this.prisma.compraTelaItem.findMany({
      where,
      include: {
        tela: {
          include: {
            proveedor: true,
            parametrosFisicos: true
          }
        },
        compra: {
          include: {
            proveedor: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return compraTelaItems.map(item => new CompraTelaItemResponseDto(item));
  }

  async findOne(id: number): Promise<CompraTelaItemResponseDto> {
    const compraTelaItem = await this.prisma.compraTelaItem.findUnique({
      where: { id },
      include: {
        tela: {
          include: {
            proveedor: true,
            parametrosFisicos: true,
            inventarioTelas: {
              take: 3,
              orderBy: { createdAt: 'desc' }
            }
          }
        },
        compra: {
          include: {
            proveedor: true,
            items: {
              include: {
                producto: true
              }
            }
          }
        }
      }
    });

    if (!compraTelaItem) {
      throw new NotFoundException(`Item de compra de tela con ID ${id} no encontrado`);
    }

    return new CompraTelaItemResponseDto(compraTelaItem);
  }

  async findByCompra(compraId: number): Promise<CompraTelaItemResponseDto[]> {
    // Verificar que la compra existe
    const compra = await this.prisma.compraProveedor.findUnique({
      where: { id: compraId }
    });

    if (!compra) {
      throw new NotFoundException(`Compra con ID ${compraId} no encontrada`);
    }

    const compraTelaItems = await this.prisma.compraTelaItem.findMany({
      where: { compraId },
      include: {
        tela: {
          include: {
            proveedor: true,
            parametrosFisicos: true
          }
        },
        compra: true
      },
      orderBy: { createdAt: 'asc' }
    });

    return compraTelaItems.map(item => new CompraTelaItemResponseDto(item));
  }

  async findByTela(telaId: number): Promise<CompraTelaItemResponseDto[]> {
    // Verificar que la tela existe
    const tela = await this.prisma.tela.findUnique({
      where: { id: telaId }
    });

    if (!tela) {
      throw new NotFoundException(`Tela con ID ${telaId} no encontrada`);
    }

    const compraTelaItems = await this.prisma.compraTelaItem.findMany({
      where: { telaId },
      include: {
        tela: {
          include: {
            proveedor: true,
            parametrosFisicos: true
          }
        },
        compra: {
          include: {
            proveedor: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return compraTelaItems.map(item => new CompraTelaItemResponseDto(item));
  }

  async update(id: number, updateCompraTelaItemDto: UpdateCompraTelaItemDto): Promise<CompraTelaItemResponseDto> {
    const compraTelaItem = await this.findOne(id);

    const { telaId, compraId, ...itemData } = updateCompraTelaItemDto;

    try {
      const data: Prisma.CompraTelaItemUpdateInput = { ...itemData };

      if (telaId && telaId !== compraTelaItem.telaId) {
        // Verificar que la nueva tela existe
        const tela = await this.prisma.tela.findUnique({
          where: { id: telaId }
        });

        if (!tela) {
          throw new NotFoundException(`Tela con ID ${telaId} no encontrada`);
        }

        data.tela = { connect: { id: telaId } };
      }

      if (compraId && compraId !== compraTelaItem.compraId) {
        // Verificar que la nueva compra existe
        const compra = await this.prisma.compraProveedor.findUnique({
          where: { id: compraId }
        });

        if (!compra) {
          throw new NotFoundException(`Compra con ID ${compraId} no encontrada`);
        }

        data.compra = { connect: { id: compraId } };
      }

      const updatedItem = await this.prisma.compraTelaItem.update({
        where: { id },
        data,
        include: {
          tela: {
            include: {
              proveedor: true,
              parametrosFisicos: true
            }
          },
          compra: {
            include: {
              proveedor: true
            }
          }
        }
      });

      return new CompraTelaItemResponseDto(updatedItem);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Error al actualizar el item de compra de tela');
        }
      }
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    const compraTelaItem = await this.findOne(id);

    await this.prisma.compraTelaItem.delete({
      where: { id }
    });
  }

  
async getEstadisticasPorTela(telaId: number): Promise<any> {
  const tela = await this.prisma.tela.findUnique({
    where: { id: telaId }
  });

  if (!tela) {
    throw new NotFoundException(`Tela con ID ${telaId} no encontrada`);
  }

  const [
    totalCompras,
    cantidadTotal,
    importeTotal,
    ultimaCompra,
    comprasEsteMes
  ] = await Promise.all([
    this.prisma.compraTelaItem.count({ where: { telaId } }),
    this.prisma.compraTelaItem.aggregate({
      where: { telaId },
      _sum: { cantidad: true }
    }),
    this.prisma.compraTelaItem.aggregate({
      where: { telaId },
      _sum: { precioKG: true }
    }),
    this.prisma.compraTelaItem.findFirst({
      where: { telaId },
      orderBy: { createdAt: 'desc' },
      include: {
        compra: true
      }
    }),
    this.prisma.compraTelaItem.count({
      where: {
        telaId,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }
    })
  ]);

  // Convertir Decimal a number
  const importeTotalNum = decimalToNumber(importeTotal._sum.precioKG);
  const cantidadTotalNum = decimalToNumber(cantidadTotal._sum.cantidad);

  return {
    tela: {
      id: tela.id,
      nombreComercial: tela.nombreComercial,
      tipoTela: tela.tipoTela
    },
    estadisticas: {
      totalCompras,
      cantidadTotal: cantidadTotalNum,
      importeTotal: importeTotalNum,
      precioPromedio: totalCompras > 0 ? importeTotalNum / totalCompras : 0,
      ultimaCompra: ultimaCompra ? {
        fecha: ultimaCompra.createdAt,
        cantidad: decimalToNumber(ultimaCompra.cantidad),
        precio: decimalToNumber(ultimaCompra.precioKG)
      } : null,
      comprasEsteMes
    }
  };
}

  async getResumenCompras(proveedorId?: number, fechaInicio?: Date, fechaFin?: Date): Promise<any> {
  const where: Prisma.CompraTelaItemWhereInput = {};

  if (proveedorId) {
    where.tela = {
      proveedorId: proveedorId
    };
  }

  if (fechaInicio || fechaFin) {
    where.compra = {
      createdAt: {
        ...(fechaInicio && { gte: fechaInicio }),
        ...(fechaFin && { 
          lte: new Date(new Date(fechaFin).setHours(23, 59, 59, 999))
        })
      }
    };
  }

  const compras = await this.prisma.compraTelaItem.findMany({
    where,
    include: {
      tela: {
        include: {
          proveedor: true
        }
      },
      compra: true
    },
    orderBy: { createdAt: 'desc' }
  });

  const resumen = compras.reduce((acc, item) => {
    const cantidad = DecimalUtil.toNumber(item.cantidad);
    const precioKG = DecimalUtil.toNumber(item.precioKG);
    const importeTotal = cantidad * precioKG;
    
    return {
      totalItems: acc.totalItems + 1,
      cantidadTotal: acc.cantidadTotal + cantidad,
      importeTotal: acc.importeTotal + importeTotal
    };
  }, { totalItems: 0, cantidadTotal: 0, importeTotal: 0 });

  return {
    resumen,
    compras: compras.map(item => new CompraTelaItemResponseDto(item))
  };
}
}