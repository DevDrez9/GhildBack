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

const agruparItemsPorProducto = (items: CreateVentaItemDto[]): Map<number, Record<string, number>> => {
    const mapa = new Map<number, Record<string, number>>();
    for (const item of items) {
        if (!mapa.has(item.productoId)) {
            mapa.set(item.productoId, {});
        }
        const tallas = mapa.get(item.productoId)!;
        tallas[item.talla] = (tallas[item.talla] || 0) + item.cantidad;
    }
    return mapa;
};

@Injectable()
export class VentaService {
  constructor(private readonly prisma: PrismaService) {}

 private async generarNumeroVenta(tiendaId: number): Promise<string> {
    const tienda = await this.prisma.tienda.findUnique({ where: { id: tiendaId } });
    if (!tienda) throw new NotFoundException(`Tienda con ID ${tiendaId} no encontrada`);
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const count = await this.prisma.venta.count({
      where: { tiendaId, createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } },
    });
    const numero = (count + 1).toString().padStart(4, '0');
    return `V-${tienda.dominio}-${year}${month}-${numero}`;
  }

 private async validarStockPorTalla(itemsAgrupados: Map<number, Record<string, number>>, tiendaId: number, sucursalId?: number): Promise<void> {
    for (const [productoId, tallas] of itemsAgrupados.entries()) {
        const inventario = sucursalId
            ? await this.prisma.inventarioSucursal.findUnique({ where: { productoId_sucursalId: { productoId, sucursalId } } })
            : await this.prisma.inventarioTienda.findUnique({ where: { productoId_tiendaId: { productoId, tiendaId } } });

        if (!inventario) {
            throw new BadRequestException(`No hay inventario registrado para el producto con ID ${productoId} en esta ubicación.`);
        }

        const stockDisponible = (inventario.stock as Record<string, number>) || {};

        for (const talla in tallas) {
            const cantidadRequerida = tallas[talla];
            const stockActualTalla = stockDisponible[talla] || 0;
            if (stockActualTalla < cantidadRequerida) {
                throw new BadRequestException(`Stock insuficiente para el producto ID ${productoId}, talla ${talla}. Disponible: ${stockActualTalla}, Solicitado: ${cantidadRequerida}`);
            }
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

    if (!items || items.length === 0) {
        throw new BadRequestException('Una venta debe tener al menos un item.');
    }

    const itemsAgrupados = agruparItemsPorProducto(items);

    // 1. Validar stock ANTES de iniciar la transacción
    await this.validarStockPorTalla(itemsAgrupados, tiendaId, sucursalId);
    
    const numeroVenta = await this.generarNumeroVenta(tiendaId);

    try {
        const ventaCreada = await this.prisma.$transaction(async (prisma) => {
            // 2. Crear la venta y sus items
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
                            productoId: item.productoId,
                            talla: item.talla, // Se guarda la talla en el item de venta
                        })),
                    },
                },
                include: { items: true },
            });

            // 3. Actualizar inventario y registrar movimientos
            for (const [productoId, tallasVendidas] of itemsAgrupados.entries()) {
                const inventario = sucursalId
                    ? await prisma.inventarioSucursal.findUnique({ where: { productoId_sucursalId: { productoId, sucursalId } } })
                    : await prisma.inventarioTienda.findUnique({ where: { productoId_tiendaId: { productoId, tiendaId } } });
                
                // Esta validación es redundante si `validarStockPorTalla` se ejecutó, pero es una capa extra de seguridad.
                if (!inventario) throw new Error(`Inventario no encontrado para producto ${productoId} durante la transacción.`);

                const stockAnterior = (inventario.stock as Record<string, number>) || {};
                const stockNuevo = { ...stockAnterior };

                for (const talla in tallasVendidas) {
                    stockNuevo[talla] = (stockNuevo[talla] || 0) - tallasVendidas[talla];
                    if (stockNuevo[talla] === 0) delete stockNuevo[talla];
                }
                
                // Actualizar el registro de inventario
                if (sucursalId) {
                    await prisma.inventarioSucursal.update({ where: { id: inventario.id }, data: { stock: stockNuevo } });
                } else {
                    await prisma.inventarioTienda.update({ where: { id: inventario.id }, data: { stock: stockNuevo } });
                }
                
                // Registrar el movimiento de inventario
                await prisma.movimientoInventario.create({
                    data: {
                        tipo: 'SALIDA_VENTA',
                        cantidad: tallasVendidas, // Guardamos el objeto de tallas vendidas
                        productoId,
                        motivo: `Venta #${venta.numeroVenta}`,
                        ventaId: venta.id,
                        inventarioSucursalId: sucursalId ? inventario.id : undefined,
                        inventarioTiendaId: sucursalId ? undefined : inventario.id,
                        stockAnterior: stockAnterior || {},
                        stockNuevo: stockNuevo || {},
                    }
                });
            }

            return venta;
        });

        // Devolvemos el resultado completo después de la transacción
        const ventaCompleta = await this.findOne(ventaCreada.id);
        return ventaCompleta;

    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw new ConflictException('Error al crear la venta, el número de venta ya existe.');
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
        tienda: true,
        sucursal: true,
        items: {
          include: {
            producto: {
              include: {
                imagenes: { take: 1, orderBy: { orden: 'asc' } }
              }
            }
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
          talla:item.talla,
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


/**
   * Obtiene estadísticas comparativas de ventas Web (Carritos terminados) vs Ventas Local.
   * @param year Año a consultar (ej: 2023)
   * @param tiendaId ID de la tienda (opcional)
   */
  async getEstadisticasCanalVenta(year: number, tiendaId?: number): Promise<any> {
    // 1. Definir rango de fechas (Inicio y Fin del año)
    const startOfYear = new Date(year, 0, 1);       // 1 de Enero 00:00:00
    const endOfYear = new Date(year, 11, 31, 23, 59, 59); // 31 de Diciembre 23:59:59

    // Filtros base
    const whereVenta: Prisma.VentaWhereInput = {
      estado: 'CONFIRMADA', // Solo ventas reales confirmadas
      createdAt: { gte: startOfYear, lte: endOfYear }
    };
    
    const whereCarrito: Prisma.CarritoWhereInput = {
      estado: 'terminado', // Indica que la compra web finalizó
      updatedAt: { gte: startOfYear, lte: endOfYear } // Usamos updatedAt como fecha de cierre
    };

    if (tiendaId) {
      whereVenta.tiendaId = tiendaId;
      whereCarrito.tiendaId = tiendaId;
    }

    // 2. Ejecutar consultas en paralelo (Solo traemos fecha y monto para ser eficientes)
    const [todasLasVentas, ventasWebCarritos] = await Promise.all([
      // Total de Ventas (Web + Local)
      this.prisma.venta.findMany({
        where: whereVenta,
        select: { createdAt: true, total: true }
      }),
      // Ventas que provienen de la Web (Carritos terminados)
      this.prisma.carrito.findMany({
        where: whereCarrito,
        select: { updatedAt: true, precio: true }
      })
    ]);

    // 3. Inicializar estructura de datos mensual (Array de 12 meses)
    // Estructura: { mes, total: {cant, monto}, web: {cant, monto}, local: {cant, monto} }
    const datosMensuales = Array.from({ length: 12 }, (_, i) => ({
      mes: i + 1,
      nombreMes: new Date(0, i).toLocaleString('es', { month: 'long' }), // Enero, Febrero...
      total: { cantidad: 0, monto: 0 },
      web: { cantidad: 0, monto: 0 },
      local: { cantidad: 0, monto: 0 }
    }));

    // 4. Procesar TOTAL de Ventas (Llenar datos globales)
    todasLasVentas.forEach(venta => {
      const mesIndex = venta.createdAt.getMonth(); // 0 = Enero
      const monto = Number(venta.total) || 0;
      
      datosMensuales[mesIndex].total.cantidad += 1;
      datosMensuales[mesIndex].total.monto += monto;
    });

    // 5. Procesar Ventas WEB (Llenar datos de carritos)
    ventasWebCarritos.forEach(carrito => {
      const mesIndex = carrito.updatedAt.getMonth();
      const monto = Number(carrito.precio) || 0;

      datosMensuales[mesIndex].web.cantidad += 1;
      datosMensuales[mesIndex].web.monto += monto;
    });

    // 6. Calcular Ventas LOCAL (Diferencia) y Totales Anuales
    const resumenAnual = {
      total: { cantidad: 0, monto: 0 },
      web: { cantidad: 0, monto: 0, porcentajeCantidad: 0, porcentajeMonto: 0 },
      local: { cantidad: 0, monto: 0, porcentajeCantidad: 0, porcentajeMonto: 0 }
    };

    const estadisticaMensual = datosMensuales.map(dato => {
      // Calculamos Local = Total - Web
      // Usamos Math.max(0, ...) para evitar negativos si hubiera inconsistencia de datos de prueba
      const cantidadLocal = Math.max(0, dato.total.cantidad - dato.web.cantidad);
      const montoLocal = Math.max(0, dato.total.monto - dato.web.monto);

      // Actualizamos el mes con el cálculo local
      dato.local.cantidad = cantidadLocal;
      dato.local.monto = montoLocal;

      // Sumar al acumulado anual
      resumenAnual.total.cantidad += dato.total.cantidad;
      resumenAnual.total.monto += dato.total.monto;
      resumenAnual.web.cantidad += dato.web.cantidad;
      resumenAnual.web.monto += dato.web.monto;
      resumenAnual.local.cantidad += cantidadLocal;
      resumenAnual.local.monto += montoLocal;

      return {
        ...dato,
        // Agregamos porcentajes mensuales para gráficos
        porcentajeWeb: dato.total.cantidad > 0 ? (dato.web.cantidad / dato.total.cantidad) * 100 : 0,
        porcentajeLocal: dato.total.cantidad > 0 ? (cantidadLocal / dato.total.cantidad) * 100 : 0
      };
    });

    // 7. Calcular porcentajes anuales finales
    if (resumenAnual.total.cantidad > 0) {
      resumenAnual.web.porcentajeCantidad = (resumenAnual.web.cantidad / resumenAnual.total.cantidad) * 100;
      resumenAnual.local.porcentajeCantidad = (resumenAnual.local.cantidad / resumenAnual.total.cantidad) * 100;
    }
    if (resumenAnual.total.monto > 0) {
      resumenAnual.web.porcentajeMonto = (resumenAnual.web.monto / resumenAnual.total.monto) * 100;
      resumenAnual.local.porcentajeMonto = (resumenAnual.local.monto / resumenAnual.total.monto) * 100;
    }

    return {
      anio: year,
      resumenAnual,
      desgloseMensual: estadisticaMensual
    };
  }

}