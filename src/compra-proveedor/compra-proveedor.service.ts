import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

import { CreateCompraProveedorDto, CreateCompraItemDto, CreateCompraTelaItemDto } from './dto/create-compra-proveedor.dto';
import { UpdateCompraProveedorDto } from './dto/update-compra-proveedor.dto';
import { UpdateEstadoCompraDto } from './dto/update-estado-compra.dto';
import { CompraProveedorResponseDto, CompraItemResponseDto, CompraTelaItemResponseDto } from './dto/compra-proveedor-response.dto';
import { FilterCompraProveedorDto } from './dto/filter-compra-proveedor.dto';
import { DecimalUtil } from '../utils/decimal.util';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from 'generated/prisma/client';

@Injectable()
export class CompraProveedorService {
  constructor(private readonly prisma: PrismaService) {}

  private async generarNumeroCompra(proveedorId: number): Promise<string> {
    const proveedor = await this.prisma.proveedor.findUnique({
      where: { id: proveedorId }
    });

    if (!proveedor) {
      throw new NotFoundException(`Proveedor con ID ${proveedorId} no encontrado`);
    }

    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    
    // Contar compras de este año
    const count = await this.prisma.compraProveedor.count({
      where: {
        proveedorId,
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`)
        }
      }
    });

    const numero = (count + 1).toString().padStart(4, '0');
    return `C-${proveedor.nombre.substring(0, 3).toUpperCase()}-${year}${month}-${numero}`;
  }

  private async validarItemsCompra(items?: CreateCompraItemDto[], itemsTela?: CreateCompraTelaItemDto[]): Promise<void> {
    if (items) {
      for (const item of items) {
        const producto = await this.prisma.producto.findUnique({
          where: { id: item.productoId }
        });

        if (!producto) {
          throw new NotFoundException(`Producto con ID ${item.productoId} no encontrado`);
        }
      }
    }

    if (itemsTela) {
      for (const item of itemsTela) {
        const tela = await this.prisma.tela.findUnique({
          where: { id: item.telaId }
        });

        if (!tela) {
          throw new NotFoundException(`Tela con ID ${item.telaId} no encontrada`);
        }
      }
    }
  }

  private async actualizarInventarioDesdeCompra(compraId: number): Promise<void> {
    const compra = await this.prisma.compraProveedor.findUnique({
      where: { id: compraId },
      include: {
        items: true,
        itemsTela: true
      }
    });

    if (!compra || compra.estado !== 'RECIBIDA') {
      return;
    }

    // Actualizar inventario de productos
    for (const item of compra.items) {
      await this.prisma.producto.update({
        where: { id: item.productoId },
        data: {
          stock: { increment: item.cantidad }
        }
      });

      // Registrar movimiento de inventario
      await this.prisma.movimientoInventario.create({
        data: {
          tipo: 'ENTRADA_COMPRA',
          cantidad: item.cantidad,
          productoId: item.productoId,
          compraId: compra.id,
          motivo: `Compra ${compra.numeroCompra}`
        }
      });
    }

    // Actualizar inventario de telas
    for (const item of compra.itemsTela) {
      const importe = item.cantidad * DecimalUtil.toNumber(item.precioKG);

      await this.prisma.inventarioTela.create({
        data: {
          proveedorId: compra.proveedorId,
          telaId: item.telaId,
          cantidadRollos: item.cantidad,
          presentacion: 'Rollos',
          tipoTela: 'Compra',
          color: 'Variado',
          precioKG: item.precioKG,
          pesoGrupo: item.cantidad,
          importe
        }
      });
    }
  }

  async create(createCompraProveedorDto: CreateCompraProveedorDto): Promise<CompraProveedorResponseDto> {
    const { proveedorId, items, itemsTela, ...compraData } = createCompraProveedorDto;

    // Verificar que el proveedor existe
    const proveedor = await this.prisma.proveedor.findUnique({
      where: { id: proveedorId }
    });

    if (!proveedor) {
      throw new NotFoundException(`Proveedor con ID ${proveedorId} no encontrado`);
    }

    // Validar items
    await this.validarItemsCompra(items, itemsTela);

    // Generar número de compra único
    const numeroCompra = await this.generarNumeroCompra(proveedorId);

    try {
      const compra = await this.prisma.compraProveedor.create({
        data: {
          ...compraData,
          numeroCompra,
          proveedor: { connect: { id: proveedorId } },
          ...(items && {
            items: {
              create: items.map(item => ({
                cantidad: item.cantidad,
                precio: item.precio,
                producto: { connect: { id: item.productoId } }
              }))
            }
          }),
          ...(itemsTela && {
            itemsTela: {
              create: itemsTela.map(item => ({
                cantidad: item.cantidad,
                precioKG: item.precioKG,
                tela: { connect: { id: item.telaId } }
              }))
            }
          })
        },
        include: {
          proveedor: true,
          items: {
            include: {
              producto: {
                include: {
                  categoria: true,
                  imagenes: {
                    take: 1,
                    orderBy: { orden: 'asc' }
                  }
                }
              }
            }
          },
          itemsTela: {
            include: {
              tela: {
                include: {
                  proveedor: true,
                  parametrosFisicos: true
                }
              }
            }
          }
        }
      });

      return new CompraProveedorResponseDto(compra);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Error al crear la compra');
        }
      }
      throw error;
    }
  }

  async findAll(filterCompraProveedorDto: FilterCompraProveedorDto = {}): Promise<{ compras: CompraProveedorResponseDto[], total: number }> {
    const {
      estado,
      proveedorId,
      numeroCompra,
      fechaInicio,
      fechaFin,
      page = 1,
      limit = 10
    } = filterCompraProveedorDto;

    const where: Prisma.CompraProveedorWhereInput = {};

    if (estado) where.estado = estado;
    if (proveedorId) where.proveedorId = proveedorId;
    if (numeroCompra) where.numeroCompra = { contains: numeroCompra};

    if (fechaInicio || fechaFin) {
      where.createdAt = {};
      if (fechaInicio) where.createdAt.gte = new Date(fechaInicio);
      if (fechaFin) {
        const fechaFinDate = new Date(fechaFin);
        fechaFinDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = fechaFinDate;
      }
    }

    const [compras, total] = await Promise.all([
      this.prisma.compraProveedor.findMany({
        where,
        include: {
          proveedor: {
            select: {
              id: true,
              nombre: true,
              contacto: true
            }
          },
          items: {
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
          itemsTela: {
            include: {
              tela: {
                select: {
                  id: true,
                  nombreComercial: true,
                  tipoTela: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      this.prisma.compraProveedor.count({ where })
    ]);

    return {
      compras: compras.map(compra => new CompraProveedorResponseDto(compra)),
      total
    };
  }

  async findOne(id: number): Promise<CompraProveedorResponseDto> {
    const compra = await this.prisma.compraProveedor.findUnique({
      where: { id },
      include: {
        proveedor: true,
        items: {
          include: {
            producto: {
              include: {
                categoria: true,
                subcategoria: true,
                imagenes: {
                  take: 1,
                  orderBy: { orden: 'asc' }
                }
              }
            }
          }
        },
        itemsTela: {
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
            }
          }
        },
        movimientos: {
          include: {
            producto: true
          }
        }
      }
    });

    if (!compra) {
      throw new NotFoundException(`Compra con ID ${id} no encontrada`);
    }

    return new CompraProveedorResponseDto(compra);
  }

  async findByNumeroCompra(numeroCompra: string): Promise<CompraProveedorResponseDto> {
    const compra = await this.prisma.compraProveedor.findUnique({
      where: { numeroCompra },
      include: {
        proveedor: true,
        items: {
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
        itemsTela: {
          include: {
            tela: {
              select: {
                id: true,
                nombreComercial: true,
                tipoTela: true
              }
            }
          }
        }
      }
    });

    if (!compra) {
      throw new NotFoundException(`Compra con número ${numeroCompra} no encontrada`);
    }

    return new CompraProveedorResponseDto(compra);
  }

  async update(id: number, updateCompraProveedorDto: UpdateCompraProveedorDto): Promise<CompraProveedorResponseDto> {
    const compra = await this.findOne(id);

    // Solo permitir actualizar compras en estado PENDIENTE
    if (compra.estado !== 'PENDIENTE') {
      throw new BadRequestException('Solo se pueden modificar compras en estado PENDIENTE');
    }

    const { proveedorId, items, itemsTela, ...compraData } = updateCompraProveedorDto;

    try {
      const data: Prisma.CompraProveedorUpdateInput = { ...compraData };

      if (proveedorId && proveedorId !== compra.proveedorId) {
        // Verificar que el nuevo proveedor existe
        const proveedor = await this.prisma.proveedor.findUnique({
          where: { id: proveedorId }
        });

        if (!proveedor) {
          throw new NotFoundException(`Proveedor con ID ${proveedorId} no encontrado`);
        }

        data.proveedor = { connect: { id: proveedorId } };
      }

      // Manejar items de productos
      if (items) {
        // Eliminar items existentes
        await this.prisma.compraItem.deleteMany({
          where: { compraId: id }
        });

        // Crear nuevos items
        data.items = {
          create: items.map(item => ({
            cantidad: item.cantidad,
            precio: item.precio,
            producto: { connect: { id: item.productoId } }
          }))
        };
      }

      // Manejar items de tela
      if (itemsTela) {
        // Eliminar items de tela existentes
        await this.prisma.compraTelaItem.deleteMany({
          where: { compraId: id }
        });

        // Crear nuevos items de tela
        data.itemsTela = {
          create: itemsTela.map(item => ({
            cantidad: item.cantidad,
            precioKG: item.precioKG,
            tela: { connect: { id: item.telaId } }
          }))
        };
      }

      const updatedCompra = await this.prisma.compraProveedor.update({
        where: { id },
        data,
        include: {
          proveedor: true,
          items: {
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
          itemsTela: {
            include: {
              tela: {
                select: {
                  id: true,
                  nombreComercial: true,
                  tipoTela: true
                }
              }
            }
          }
        }
      });

      return new CompraProveedorResponseDto(updatedCompra);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Error al actualizar la compra');
        }
      }
      throw error;
    }
  }

  async updateEstado(id: number, updateEstadoCompraDto: UpdateEstadoCompraDto): Promise<CompraProveedorResponseDto> {
    const compra = await this.findOne(id);

    const updatedCompra = await this.prisma.compraProveedor.update({
      where: { id },
      data: {
        estado: updateEstadoCompraDto.estado
      },
      include: {
        proveedor: true,
        items: {
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
        itemsTela: {
          include: {
            tela: {
              select: {
                id: true,
                nombreComercial: true,
                tipoTela: true
              }
            }
          }
        }
      }
    });

    // Si el estado es RECIBIDA, actualizar inventario
    if (updateEstadoCompraDto.estado === 'RECIBIDA') {
      await this.actualizarInventarioDesdeCompra(id);
    }

    return new CompraProveedorResponseDto(updatedCompra);
  }

  async remove(id: number): Promise<void> {
    const compra = await this.findOne(id);

    // Solo permitir eliminar compras en estado PENDIENTE
    if (compra.estado !== 'PENDIENTE') {
      throw new BadRequestException('Solo se pueden eliminar compras en estado PENDIENTE');
    }

    // Eliminar items primero
    await this.prisma.compraItem.deleteMany({
      where: { compraId: id }
    });

    await this.prisma.compraTelaItem.deleteMany({
      where: { compraId: id }
    });

    await this.prisma.compraProveedor.delete({
      where: { id }
    });
  }

  async getEstadisticas(proveedorId?: number): Promise<any> {
    const where: Prisma.CompraProveedorWhereInput = {};
    
    if (proveedorId) where.proveedorId = proveedorId;

    const [
      totalCompras,
      comprasPendientes,
      comprasCompletadas,
      comprasCanceladas,
      totalGastado,
      comprasEsteMes
    ] = await Promise.all([
      this.prisma.compraProveedor.count({ where }),
      this.prisma.compraProveedor.count({
        where: { ...where, estado: 'PENDIENTE' }
      }),
      this.prisma.compraProveedor.count({
        where: { ...where, estado: 'RECIBIDA' }
      }),
      this.prisma.compraProveedor.count({
        where: { ...where, estado: 'CANCELADA' }
      }),
      this.prisma.compraProveedor.aggregate({
        where: { ...where, estado: 'RECIBIDA' },
        _sum: { total: true }
      }),
      this.prisma.compraProveedor.count({
        where: {
          ...where,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      })
    ]);

    return {
      totalCompras,
      comprasPendientes,
      comprasCompletadas,
      comprasCanceladas,
      totalGastado: DecimalUtil.toNumber(totalGastado._sum.total),
      comprasEsteMes
    };
  }

  async getComprasPorProveedor(proveedorId: number): Promise<CompraProveedorResponseDto[]> {
    // Verificar que el proveedor existe
    const proveedor = await this.prisma.proveedor.findUnique({
      where: { id: proveedorId }
    });

    if (!proveedor) {
      throw new NotFoundException(`Proveedor con ID ${proveedorId} no encontrado`);
    }

    const compras = await this.prisma.compraProveedor.findMany({
      where: { proveedorId },
      include: {
        proveedor: {
          select: {
            id: true,
            nombre: true
          }
        },
        items: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        },
        itemsTela: {
          include: {
            tela: {
              select: {
                id: true,
                nombreComercial: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return compras.map(compra => new CompraProveedorResponseDto(compra));
  }
}