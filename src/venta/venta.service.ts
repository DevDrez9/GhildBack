import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

import { CreateVentaDto, CreateVentaItemDto } from './dto/create-venta.dto';
import { UpdateVentaDto } from './dto/update-venta.dto';
import { UpdateEstadoVentaDto } from './dto/update-estado-venta.dto';
import { VentaResponseDto, VentaItemResponseDto } from './dto/venta-response.dto';
import { FilterVentaDto } from './dto/filter-venta.dto';
import { PrismaService } from 'src/prisma.service';
import { EstadoVenta, Prisma } from 'generated/prisma/client';
import { VentaAgregadaResponseDto } from './dto/venta-agregada-response';
import { Decimal } from 'generated/prisma/runtime/library';

@Injectable()
export class VentaService {
  constructor(private readonly prisma: PrismaService) {}

  private async generarNumeroVenta(tiendaId: number): Promise<string> {
    const tienda = await this.prisma.tienda.findUnique({
      where: { id: tiendaId }
    });

    if (!tienda) {
      throw new NotFoundException(`Tienda con ID ${tiendaId} no encontrada`);
    }

    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    
    // Contar ventas de este año
    const count = await this.prisma.venta.count({
      where: {
        tiendaId,
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`)
        }
      }
    });

    const numero = (count + 1).toString().padStart(4, '0');
    return `V-${tienda.dominio}-${year}${month}-${numero}`;
  }

  private async validarStockProductos(items: CreateVentaItemDto[], sucursalId?: number): Promise<void> {
    for (const item of items) {
      let stockDisponible = 0;

      if (sucursalId) {
        // Verificar stock en sucursal
        const inventario = await this.prisma.inventarioSucursal.findUnique({
          where: {
            productoId_sucursalId: {
              productoId: item.productoId,
              sucursalId: sucursalId
            }
          }
        });

        stockDisponible = inventario?.stock || 0;
      } else {
        // Verificar stock en tienda principal
        const producto = await this.prisma.producto.findUnique({
          where: { id: item.productoId }
        });

        if (!producto) {
          throw new NotFoundException(`Producto con ID ${item.productoId} no encontrado`);
        }

        stockDisponible = producto.stock;
      }

      if (stockDisponible < item.cantidad) {
        const producto = await this.prisma.producto.findUnique({
          where: { id: item.productoId }
        });

        throw new BadRequestException(
          `Stock insuficiente para el producto "${producto?.nombre}". ` +
          `Solicitado: ${item.cantidad}, Disponible: ${stockDisponible}`
        );
      }
    }
  }

  private async actualizarStockProductos(items: CreateVentaItemDto[], sucursalId?: number): Promise<void> {
    for (const item of items) {
      if (sucursalId) {
        // Actualizar stock en sucursal
        await this.prisma.inventarioSucursal.update({
          where: {
            productoId_sucursalId: {
              productoId: item.productoId,
              sucursalId: sucursalId
            }
          },
          data: {
            stock: { decrement: item.cantidad }
          }
        });
      } else {
        // Actualizar stock en tienda principal
        await this.prisma.producto.update({
          where: { id: item.productoId },
          data: {
            stock: { decrement: item.cantidad }
          }
        });
      }

      // Registrar movimiento de inventario
      await this.prisma.movimientoInventario.create({
        data: {
          tipo: 'SALIDA_VENTA',
          cantidad: item.cantidad,
          productoId: item.productoId,
          motivo: 'Venta realizada',
          inventarioSucursalId: sucursalId ? undefined : null,
          stockAnterior: 0, // Podrías calcular esto si es necesario
          stockNuevo: 0     // Podrías calcular esto si es necesario
        }
      });
    }
  }

  async create(createVentaDto: CreateVentaDto): Promise<VentaResponseDto> {
    const { items, sucursalId, tiendaId, ...ventaData } = createVentaDto;

    // Verificar que la tienda existe
    const tienda = await this.prisma.tienda.findUnique({
      where: { id: tiendaId }
    });

    if (!tienda) {
      throw new NotFoundException(`Tienda con ID ${tiendaId} no encontrada`);
    }

    // Verificar que la sucursal existe si se proporciona
    if (sucursalId) {
      const sucursal = await this.prisma.sucursal.findUnique({
        where: { id: sucursalId }
      });

      if (!sucursal) {
        throw new NotFoundException(`Sucursal con ID ${sucursalId} no encontrada`);
      }
    }

    // Validar stock de productos
    await this.validarStockProductos(items, sucursalId);

    // Generar número de venta único
    const numeroVenta = await this.generarNumeroVenta(tiendaId);

    try {
      return await this.prisma.$transaction(async (prisma) => {
        // Crear la venta
        const venta = await prisma.venta.create({
          data: {
            ...ventaData,
            numeroVenta,
            tiendaId,
            sucursalId,
            items: {
              create: items.map(item => ({
                cantidad: item.cantidad,
                precio: item.precio,
                productoId: item.productoId
              }))
            }
          },
          include: {
            tienda: true,
            sucursal: true,
            items: {
              include: {
                producto: {
                  include: {
                    imagenes: {
                      take: 1,
                      orderBy: { orden: 'asc' }
                    }
                  }
                }
              }
            }
          }
        });

        // Actualizar stock de productos
        await this.actualizarStockProductos(items, sucursalId);

        return new VentaResponseDto(venta);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Error al crear la venta');
        }
      }
      throw error;
    }
  }

  async findAll(filterVentaDto: FilterVentaDto = {}): Promise<{ ventas: VentaResponseDto[], total: number }> {
    const {
        estado,
        metodoPago,
        tiendaId,
        sucursalId,
        cliente,
        numeroVenta,
        fechaInicio,
        fechaFin,
        // Usamos nombres temporales para los valores sin procesar
        page: rawPage = 1,
        limit: rawLimit = 10
    } = filterVentaDto;

    // 💡 PASO DE CORRECCIÓN: Convertir a números enteros
    const page = parseInt(rawPage.toString(), 10) || 1;
    const limit = parseInt(rawLimit.toString(), 10) || 10;

    const where: Prisma.VentaWhereInput = {};
    
    // ... (El resto de la lógica 'where' permanece igual) ...
    if (estado) where.estado = estado;
    if (metodoPago) where.metodoPago = metodoPago;
    if (tiendaId) where.tiendaId = tiendaId;
    if (sucursalId) where.sucursalId = sucursalId;
    if (cliente) where.cliente = { contains: cliente };
    if (numeroVenta) where.numeroVenta = { contains: numeroVenta};

    if (fechaInicio || fechaFin) {
        where.createdAt = {};
        if (fechaInicio) where.createdAt.gte = new Date(fechaInicio);
        if (fechaFin) {
            const fechaFinDate = new Date(fechaFin);
            fechaFinDate.setHours(23, 59, 59, 999);
            where.createdAt.lte = fechaFinDate;
        }
    }

    const [ventas, total] = await Promise.all([
        this.prisma.venta.findMany({
            where,
            include: {
                tienda: true,
                sucursal: true,
                items: {
                    include: {
                        producto: {
                            include: {
                                imagenes: {
                                    take: 1,
                                    orderBy: { orden: 'asc' }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            // El cálculo ahora usa números enteros garantizados
            skip: (page - 1) * limit,
            take: limit
        }),
        this.prisma.venta.count({ where })
    ]);

    return {
        ventas: ventas.map(venta => new VentaResponseDto(venta)),
        total
    };
}

  async findOne(id: number): Promise<VentaResponseDto> {
    const venta = await this.prisma.venta.findUnique({
      where: { id },
      include: {
        tienda: {
          include: {
            configWeb: true
          }
        },
        sucursal: true,
        items: {
          include: {
            producto: {
              include: {
                categoria: true,
                subcategoria: true,
                imagenes: true
              }
            }
          }
        },
        movimientoInventario: {
          include: {
            producto: true
          }
        }
      }
    });

    if (!venta) {
      throw new NotFoundException(`Venta con ID ${id} no encontrada`);
    }

    return new VentaResponseDto(venta);
  }

  async findByNumeroVenta(numeroVenta: string): Promise<VentaResponseDto> {
    const venta = await this.prisma.venta.findUnique({
      where: { numeroVenta },
      include: {
        tienda: true,
        sucursal: true,
        items: {
          include: {
            producto: {
              include: {
                imagenes: {
                  take: 1,
                  orderBy: { orden: 'asc' }
                }
              }
            }
          }
        }
      }
    });

    if (!venta) {
      throw new NotFoundException(`Venta con número ${numeroVenta} no encontrada`);
    }

    return new VentaResponseDto(venta);
  }

 async update(id: number, updateVentaDto: UpdateVentaDto): Promise<VentaResponseDto> {
  const venta = await this.findOne(id);

  // Solo permitir actualizar ventas en estado PENDIENTE
  if (venta.estado !== EstadoVenta.PENDIENTE) {
    throw new BadRequestException('Solo se pueden modificar ventas en estado PENDIENTE');
  }

  // Extraer campos y manejar relaciones por separado
  const { items, ...ventaData } = updateVentaDto;

  try {
    const data: Prisma.VentaUpdateInput = { ...ventaData };

    // Si hay items, actualizarlos
    if (items) {
      // Primero eliminar items existentes
      await this.prisma.ventaItem.deleteMany({
        where: { ventaId: id }
      });

      // Luego crear nuevos items
      data.items = {
        create: items.map(item => ({
          cantidad: item.cantidad,
          precio: item.precio,
          producto: { connect: { id: item.productoId } }
        }))
      };
    }

    const updatedVenta = await this.prisma.venta.update({
      where: { id },
      data,
      include: {
        tienda: true,
        sucursal: true,
        items: {
          include: {
            producto: {
              include: {
                imagenes: {
                  take: 1,
                  orderBy: { orden: 'asc' }
                }
              }
            }
          }
        }
      }
    });

    return new VentaResponseDto(updatedVenta);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException('Error al actualizar la venta');
      }
    }
    throw error;
  }
}

  async updateEstado(id: number, updateEstadoVentaDto: UpdateEstadoVentaDto): Promise<VentaResponseDto> {
    const venta = await this.findOne(id);

    const updatedVenta = await this.prisma.venta.update({
      where: { id },
      data: {
        estado: updateEstadoVentaDto.estado
      },
      include: {
        tienda: true,
        sucursal: true,
        items: {
          include: {
            producto: {
              include: {
                imagenes: {
                  take: 1,
                  orderBy: { orden: 'asc' }
                }
              }
            }
          }
        }
      }
    });

    return new VentaResponseDto(updatedVenta);
  }

  async remove(id: number): Promise<void> {
    const venta = await this.findOne(id);

    // Solo permitir eliminar ventas en estado PENDIENTE
    if (venta.estado !== EstadoVenta.PENDIENTE) {
      throw new BadRequestException('Solo se pueden eliminar ventas en estado PENDIENTE');
    }

    await this.prisma.venta.delete({
      where: { id }
    });
  }

  async getEstadisticas(tiendaId?: number, sucursalId?: number): Promise<any> {
    const where: Prisma.VentaWhereInput = {};
    
    if (tiendaId) where.tiendaId = tiendaId;
    if (sucursalId) where.sucursalId = sucursalId;

    const [
      totalVentas,
      ventasHoy,
      ventasEsteMes,
      totalIngresos,
      ingresosEsteMes,
      ventasPorEstado,
      ventasPorMetodoPago
    ] = await Promise.all([
      this.prisma.venta.count({ where }),
      this.prisma.venta.count({
        where: {
          ...where,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      this.prisma.venta.count({
        where: {
          ...where,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      this.prisma.venta.aggregate({
        where,
        _sum: { total: true }
      }),
      this.prisma.venta.aggregate({
        where: {
          ...where,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        },
        _sum: { total: true }
      }),
      this.prisma.venta.groupBy({
        by: ['estado'],
        where,
        _count: { _all: true }
      }),
      this.prisma.venta.groupBy({
        by: ['metodoPago'],
        where,
        _count: { _all: true },
        _sum: { total: true }
      })
    ]);

    return {
      totalVentas,
      ventasHoy,
      ventasEsteMes,
      totalIngresos: totalIngresos._sum.total || 0,
      ingresosEsteMes: ingresosEsteMes._sum.total || 0,
      ventasPorEstado,
      ventasPorMetodoPago
    };
  }

  async getVentasPorPeriodo(periodo: 'dia' | 'semana' | 'mes', tiendaId?: number, sucursalId?: number): Promise<any> {
    const where: Prisma.VentaWhereInput = {};
    
    if (tiendaId) where.tiendaId = tiendaId;
    if (sucursalId) where.sucursalId = sucursalId;

    let fechaInicio: Date;

    switch (periodo) {
      case 'dia':
        fechaInicio = new Date(new Date().setHours(0, 0, 0, 0));
        break;
      case 'semana':
        fechaInicio = new Date();
        fechaInicio.setDate(fechaInicio.getDate() - 7);
        break;
      case 'mes':
        fechaInicio = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        break;
    }

    where.createdAt = { gte: fechaInicio };

    const ventas = await this.prisma.venta.findMany({
      where,
      include: {
        items: {
          include: {
            producto: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return ventas.map(venta => new VentaResponseDto(venta));
  }


  async getVentasGlobalesPorProducto(
    productoId: number,
    tiendaId?: number,
): Promise<VentaAgregadaResponseDto> {
    
    // 1. Verificar la existencia del producto
    const producto = await this.prisma.producto.findUnique({
        where: { id: productoId },
        select: { nombre: true, id: true }
    });

    if (!producto) {
        throw new NotFoundException(`Producto con ID ${productoId} no encontrado`);
    }

    // 2. Definir los filtros WHERE de SQL (tiendaId es opcional)
     const tiendaFilter = tiendaId 
        ? Prisma.sql`AND v.\`tiendaId\` = ${tiendaId}` // Usar acentos graves
        : Prisma.empty;
        
    // 3. ⭐ CONSULTA CRUDA para calcular SUM(precio * cantidad) ⭐
     const resultadoRaw = await this.prisma.$queryRaw<{
        total_unidades: bigint, 
        total_ingresos: string // Cambiamos Decimal a string
    }[]>(Prisma.sql`
        SELECT
            SUM(vi.\`cantidad\`) AS total_unidades,
            -- Aplicamos CAST a CHAR para que MySQL devuelva un string que JavaScript pueda parsear
            CAST(
                SUM(
                    -- LÓGICA DE PRECIO DE RESPALDO ANIDADA
                    (
                        CASE
                            WHEN vi.\`precio\` IS NULL OR vi.\`precio\` = 0 THEN 
                                COALESCE(p.\`precio\`, 0)
                            ELSE vi.\`precio\` 
                        END
                    ) * vi.\`cantidad\`
                ) 
                AS CHAR) AS total_ingresos -- <--- CLAVE: Forzamos la salida como texto
        FROM \`VentaItem\` vi
        JOIN \`Venta\` v ON v.id = vi.\`ventaId\`
        JOIN \`Producto\` p ON p.id = vi.\`productoId\` 
        WHERE 
            vi.\`productoId\` = ${productoId}
            ${tiendaFilter}
    `);
    const resultado = resultadoRaw[0];
  
      // 4. Devolver la respuesta (convirtiendo la cadena de ingreso a número)
    const totalIngresosNumber = resultado.total_ingresos 
                               ? parseFloat(resultado.total_ingresos) 
                               : 0;
      
    // 4. Devolver la respuesta
    return new VentaAgregadaResponseDto({
        productoId: producto.id,
        nombreProducto: producto.nombre,
        // BigInt (total_unidades) debe convertirse a number o string
        totalUnidadesVendidas: Number(resultado.total_unidades) || 0, 
        // Decimal (total_ingresos) debe convertirse a number
         totalIngresos: totalIngresosNumber, // <--- Usamos el número convertido
    });
}

/**
 * Obtiene la lista de todas las ventas de una tienda (incluye todas sus sucursales).
 * Este método usa el findAll existente con un filtro de tiendaId.
 */
async getVentasPorTienda(
    tiendaId: number,
    filterVentaDto: FilterVentaDto = {}
): Promise<{ ventas: VentaResponseDto[], total: number }> {
    
    // Verificar que la tienda existe (opcional, pero buena práctica)
    const tienda = await this.prisma.tienda.findUnique({ where: { id: tiendaId } });
    if (!tienda) {
        throw new NotFoundException(`Tienda con ID ${tiendaId} no encontrada`);
    }

    // Aseguramos que el filtro incluya el tiendaId
    filterVentaDto.tiendaId = tiendaId;

    // Reutilizamos el método findAll, que ya maneja paginación y otros filtros.
    return this.findAll(filterVentaDto);
}

}