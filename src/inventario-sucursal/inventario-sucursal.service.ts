import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma.service';
import { DecimalUtil } from '../utils/decimal.util';

// DTOs
import { CreateInventarioSucursalDto } from './dto/create-inventario-sucursal.dto';
import { UpdateInventarioSucursalDto } from './dto/update-inventario-sucursal.dto';
import { AjusteInventarioDto } from './dto/ajuste-inventario.dto';
import { InventarioSucursalResponseDto } from './dto/inventario-sucursal-response.dto';
import { FilterInventarioSucursalDto } from './dto/filter-inventario-sucursal.dto';

/**
 * 헬퍼 함수: 사이즈별 재고 객체에서 총 재고를 계산합니다.
 * @param stock Prisma의 JSON 객체입니다.
 * @returns 총 단위 수입니다.
 */
const calcularStockTotal = (stock: Prisma.JsonValue): number => {
    if (typeof stock === 'object' && stock !== null && !Array.isArray(stock)) {
        const stockComoObjetoNumerico = stock as Record<string, number>;
        return Object.values(stockComoObjetoNumerico).reduce((sum, current) => sum + (current || 0), 0);
    }
    return 0;
};

@Injectable()
export class InventarioSucursalService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateInventarioSucursalDto): Promise<InventarioSucursalResponseDto> {
    const { productoId, sucursalId, tiendaId, stock, ...inventarioData } = createDto;

    // ... (tus validaciones de existencia de producto, sucursal y tienda aquí) ...

    const existingInventario = await this.prisma.inventarioSucursal.findUnique({
      where: { productoId_sucursalId: { productoId, sucursalId } },
    });
    if (existingInventario) {
      throw new ConflictException('Ya existe un registro de inventario para este producto en la sucursal');
    }

    const inventario = await this.prisma.inventarioSucursal.create({
      data: {
        ...inventarioData,
        stock: stock || {}, // ✅ MODIFICADO: Guarda un objeto de stock
        producto: { connect: { id: productoId } },
        sucursal: { connect: { id: sucursalId } },
        tienda: { connect: { id: tiendaId } },
      },
      include: { /* ... tus includes ... */ },
    });
    return new InventarioSucursalResponseDto(inventario);
  }

  async findAll(filterDto: FilterInventarioSucursalDto = {}): Promise<{ inventarios: InventarioSucursalResponseDto[], total: number }> {
    const { productoId, sucursalId, tiendaId, bajoStock, sinStock, page = 1, limit = 10 } = filterDto;
    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.max(1, Number(limit) || 10);

    const where: Prisma.InventarioSucursalWhereInput = {};
    if (productoId) where.productoId = productoId;
    if (sucursalId) where.sucursalId = sucursalId;
    if (tiendaId) where.tiendaId = tiendaId;

    // ✅ MODIFICADO: Se obtiene todo y se filtra en memoria
    const todosLosInventarios = await this.prisma.inventarioSucursal.findMany({
      where,
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
          },
          sucursal: {
            include: {
              tienda: true
            }
          },
          tienda: true
        },
      orderBy: { producto: { nombre: 'asc' } },
    });

    let inventariosFiltrados = todosLosInventarios;
    if (sinStock) {
      inventariosFiltrados = todosLosInventarios.filter(inv => calcularStockTotal(inv.stock) === 0);
    } else if (bajoStock) {
      inventariosFiltrados = todosLosInventarios.filter(inv => {
        const total = calcularStockTotal(inv.stock);
        return total > 0 && total <= (inv.stockMinimo || 5);
      });
    }

    const total = inventariosFiltrados.length;
    const paginatedInventarios = inventariosFiltrados.slice((pageNumber - 1) * limitNumber, pageNumber * limitNumber);

    return {
      inventarios: paginatedInventarios.map(inv => new InventarioSucursalResponseDto(inv)),
      total,
    };
  }

  async findOne(id: number): Promise<InventarioSucursalResponseDto> {
    const inventario = await this.prisma.inventarioSucursal.findUnique({
      where: { id },
      include: { /* ... tus includes ... */ },
    });
    if (!inventario) {
      throw new NotFoundException(`Inventario con ID ${id} no encontrado`);
    }
    return new InventarioSucursalResponseDto(inventario);
  }
  
  // ... (findByProductoAndSucursal y findBySucursal funcionan sin cambios gracias al DTO) ...
   async findByProductoAndSucursal(productoId: number, sucursalId: number): Promise<InventarioSucursalResponseDto> {
    const inventario = await this.prisma.inventarioSucursal.findUnique({
      where: {
        productoId_sucursalId: {
          productoId,
          sucursalId
        }
      },
      include: {
        producto: {
          include: {
            categoria: true,
            imagenes: {
              take: 1,
              orderBy: { orden: 'asc' }
            }
          }
        },
        sucursal: true,
        tienda: true
      }
    });

    if (!inventario) {
      throw new NotFoundException('No se encontró inventario para el producto en la sucursal especificada');
    }

    return new InventarioSucursalResponseDto(inventario);
  }

   async findBySucursal(sucursalId: number): Promise<InventarioSucursalResponseDto[]> { // <-- Cambio el tipo de retorno a un array
    
    // 1. Uso de findMany para obtener todos los registros que coincidan con el filtro
    const inventarios = await this.prisma.inventarioSucursal.findMany({
        where: {
            // 2. Sintaxis correcta para filtrar por el campo sucursalId
            sucursalId: sucursalId, 
        },
        include: {
            producto: {
                include: {
                    categoria: true,
                    imagenes: {
                        take: 1,
                        orderBy: { orden: 'asc' }
                    }
                }
            },
            sucursal: true,
            tienda: true
        }
    });

    if (!inventarios || inventarios.length === 0) {
        // En lugar de "No se encontró inventario para el producto...",
        // indicamos que no hay inventario para esa sucursal.
        throw new NotFoundException(`No se encontró inventario para la sucursal con ID ${sucursalId}.`);
    }

    // 3. Mapear la lista de resultados de Prisma a una lista de DTOs de respuesta
    return inventarios.map(inventario => new InventarioSucursalResponseDto(inventario));
}


  async update(id: number, updateDto: UpdateInventarioSucursalDto): Promise<InventarioSucursalResponseDto> {
    await this.findOne(id);
    const { stock, ...dataToUpdate } = updateDto as any;
    if (stock) {
      throw new BadRequestException("Para modificar el stock, utilice el endpoint de ajuste de inventario.");
    }
    const updated = await this.prisma.inventarioSucursal.update({
      where: { id },
      data: dataToUpdate,
      include: { /* ... tus includes ... */ },
    });
    return new InventarioSucursalResponseDto(updated);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    const totalMovimientos = await this.prisma.movimientoInventario.count({ where: { inventarioSucursalId: id } });
    if (totalMovimientos > 0) {
      throw new ConflictException('No se puede eliminar el inventario porque tiene movimientos asociados');
    }
    await this.prisma.inventarioSucursal.delete({ where: { id } });
  }

  /**
   * 🔄 REESCRITO: Lógica para ajustar stock por tallas.
   */
  async ajustarStock(id: number, ajusteDto: AjusteInventarioDto, usuarioId?: number): Promise<InventarioSucursalResponseDto> {
    const { cantidad, motivo, observaciones } = ajusteDto;
    if (Object.keys(cantidad).length === 0) {
      throw new BadRequestException('El objeto de ajuste no puede estar vacío.');
    }

    return this.prisma.$transaction(async (prisma) => {
      const inventario = await prisma.inventarioSucursal.findUnique({ where: { id } });
      if (!inventario) throw new NotFoundException(`Inventario con ID ${id} no encontrado`);

      const stockAnterior = (inventario.stock as Record<string, number>) || {};
      const stockNuevo = { ...stockAnterior };

      for (const talla in cantidad) {
        stockNuevo[talla] = (stockNuevo[talla] || 0) + cantidad[talla];
        if (stockNuevo[talla] < 0) {
          throw new BadRequestException(`El ajuste resultaría en stock negativo para la talla ${talla}.`);
        }
        if (stockNuevo[talla] === 0) delete stockNuevo[talla];
      }

      const actualizado = await prisma.inventarioSucursal.update({
        where: { id },
        data: { stock: stockNuevo },
        include: { /* ... tus includes ... */ },
      });

      await prisma.movimientoInventario.create({
        data: {
          tipo: 'AJUSTE_SUCURSAL',
          cantidad,
          productoId: inventario.productoId,
          motivo: `${motivo}: ${observaciones || 'Sin observaciones'}`,
          usuarioId,
          inventarioSucursalId: id,
          stockAnterior,
          stockNuevo,
        },
      });

      return new InventarioSucursalResponseDto(actualizado);
    });
  }

  /**
   * 🔄 REESCRITO: Lógica para transferir stock por tallas entre sucursales.
   */
  async transferirEntreSucursales(origenId: number, destinoId: number, cantidad: Record<string, number>, motivo: string, usuarioId?: number): Promise<any> {
    if (origenId === destinoId) throw new BadRequestException('No se puede transferir a la misma sucursal');
    if (Object.values(cantidad).some(qty => qty <= 0)) {
      throw new BadRequestException('Las cantidades a transferir deben ser mayores a cero.');
    }

    return this.prisma.$transaction(async (prisma) => {
      const [invOrigen, invDestino] = await Promise.all([
        prisma.inventarioSucursal.findUnique({ where: { id: origenId }, include: { sucursal: true } }),
        prisma.inventarioSucursal.findUnique({ where: { id: destinoId }, include: { sucursal: true } }),
      ]);
      if (!invOrigen || !invDestino) throw new NotFoundException('Inventario de origen o destino no encontrado.');
      if (invOrigen.productoId !== invDestino.productoId) throw new BadRequestException('La transferencia debe ser del mismo producto.');
      
      const stockOrigen = (invOrigen.stock as Record<string, number>) || {};
      const stockDestino = (invDestino.stock as Record<string, number>) || {};
      const nuevoStockOrigen = { ...stockOrigen };
      const nuevoStockDestino = { ...stockDestino };

      for (const talla in cantidad) {
        if ((nuevoStockOrigen[talla] || 0) < cantidad[talla]) {
          throw new BadRequestException(`Stock insuficiente para la talla ${talla} en el origen.`);
        }
        nuevoStockOrigen[talla] -= cantidad[talla];
        if (nuevoStockOrigen[talla] === 0) delete nuevoStockOrigen[talla];
        nuevoStockDestino[talla] = (nuevoStockDestino[talla] || 0) + cantidad[talla];
      }

      const [origenActualizado, destinoActualizado] = await Promise.all([
        prisma.inventarioSucursal.update({ where: { id: origenId }, data: { stock: nuevoStockOrigen } }),
        prisma.inventarioSucursal.update({ where: { id: destinoId }, data: { stock: nuevoStockDestino } }),
      ]);
      
      await prisma.movimientoInventario.createMany({
        data: [
          { tipo: 'TRANSFERENCIA_SALIDA', cantidad, productoId: invOrigen.productoId, motivo: `A sucursal ${invDestino.sucursal.nombre}: ${motivo}`, usuarioId, inventarioSucursalId: origenId, stockAnterior: stockOrigen, stockNuevo: nuevoStockOrigen },
          { tipo: 'TRANSFERENCIA_ENTRADA', cantidad, productoId: invDestino.productoId, motivo: `Desde sucursal ${invOrigen.sucursal.nombre}: ${motivo}`, usuarioId, inventarioSucursalId: destinoId, stockAnterior: stockDestino, stockNuevo: nuevoStockDestino },
        ]
      });

      return {
        message: 'Transferencia realizada exitosamente',
        origen: new InventarioSucursalResponseDto(origenActualizado),
        destino: new InventarioSucursalResponseDto(destinoActualizado),
      };
    });
  }

  // ... (getProductosBajoStock y getProductosSinStock usan la misma lógica de filtrado en memoria que findAll) ...
/*
  async getProductosBajoStock(sucursalId?: number, tiendaId?: number, stockMinimo?: number): Promise<{ inventarios: InventarioSucursalResponseDto[], total: number }> {
    const where: Prisma.InventarioSucursalWhereInput = {
      stock: { gt: 0 } // Solo productos con stock
    };

    if (sucursalId) where.sucursalId = sucursalId;
    if (tiendaId) where.tiendaId = tiendaId;

    const allInventarios = await this.prisma.inventarioSucursal.findMany({
      where,
      include: {
        producto: {
          include: {
            categoria: true,
            imagenes: {
              take: 1,
              orderBy: { orden: 'asc' }
            }
          }
        },
        sucursal: true,
        tienda: true
      }
    });

    // Filtrar en la aplicación
    const inventariosBajoStock = allInventarios.filter(inv => {
      const limite = stockMinimo !== undefined ? stockMinimo : (inv.stockMinimo || 5);
      return inv.stock <= limite;
    });

    return {
      inventarios: inventariosBajoStock.map(inv => new InventarioSucursalResponseDto(inv)),
      total: inventariosBajoStock.length
    };
  }*/

  async getProductosSinStock(sucursalId?: number, tiendaId?: number): Promise<{ inventarios: InventarioSucursalResponseDto[], total: number }> {
    const where: Prisma.InventarioSucursalWhereInput = {
      stock: { equals: 0 }
    };

    if (sucursalId) where.sucursalId = sucursalId;
    if (tiendaId) where.tiendaId = tiendaId;

    const [inventarios, total] = await Promise.all([
      this.prisma.inventarioSucursal.findMany({
        where,
        include: {
          producto: {
            include: {
              categoria: true,
              imagenes: {
                take: 1,
                orderBy: { orden: 'asc' }
              }
            }
          },
          sucursal: true,
          tienda: true
        },
        orderBy: { producto: { nombre: 'asc' } }
      }),
      this.prisma.inventarioSucursal.count({ where })
    ]);

    return {
      inventarios: inventarios.map(inv => new InventarioSucursalResponseDto(inv)),
      total
    };
  }
async getEstadisticas(sucursalId?: number, tiendaId?: number): Promise<any> {
    const where: Prisma.InventarioSucursalWhereInput = {};
    
    if (sucursalId) where.sucursalId = sucursalId;
    if (tiendaId) where.tiendaId = tiendaId;

    // 1. Traemos todos los inventarios con el precio del producto
    const allInventarios = await this.prisma.inventarioSucursal.findMany({
      where,
      include: {
        producto: {
          select: {
            precio: true
          }
        }
      }
    });

    // 2. Inicializamos contadores
    let productosConStock = 0;
    let productosSinStock = 0;
    let productosBajoStock = 0;
    let valorTotal = 0;

    // 3. Procesamos cada registro en memoria
    allInventarios.forEach(inv => {
      // Usamos la función helper para sumar las tallas del JSON
      const totalUnidades = calcularStockTotal(inv.stock);

      if (totalUnidades > 0) {
        productosConStock++;
        
        // Verificar si es bajo stock (stock actual <= stock mínimo)
        const stockMinimo = inv.stockMinimo !== undefined ? inv.stockMinimo : 5;
        if (totalUnidades <= stockMinimo) {
          productosBajoStock++;
        }
      } else {
        productosSinStock++;
      }

      // Calcular valor monetario (Precio * Cantidad Total)
      const precio = DecimalUtil.toNumber(inv.producto.precio);
      valorTotal += precio * totalUnidades;
    });

    const totalProductos = allInventarios.length;

    // 4. Retornamos el objeto con los cálculos
    return {
      totalProductos,
      productosConStock,
      productosSinStock,
      productosBajoStock,
      valorTotalInventario: valorTotal,
      porcentajeConStock: totalProductos > 0 ? (productosConStock / totalProductos) * 100 : 0,
      porcentajeBajoStock: totalProductos > 0 ? (productosBajoStock / totalProductos) * 100 : 0,
      stockTotalUnidades: allInventarios.reduce((sum, inv) => sum + calcularStockTotal(inv.stock), 0) // Dato extra útil: total de prendas físicas
    };
  }

  // ... (getMovimientos no necesita cambios) ...

  async getMovimientos(inventarioId: number, page: number = 1, limit: number = 10): Promise<any> {
    const inventario = await this.findOne(inventarioId);

    const [movimientos, total] = await Promise.all([
      this.prisma.movimientoInventario.findMany({
        where: { inventarioSucursalId: inventarioId },
        include: {
          usuario: {
            select: {
              id: true,
              nombre: true,
              email: true
            }
          },
          venta: {
            select: {
              id: true,
              numeroVenta: true
            }
          },
          transferencia: {
            select: {
              id: true,
              codigo: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      this.prisma.movimientoInventario.count({
        where: { inventarioSucursalId: inventarioId }
      })
    ]);

    return {
      inventario: new InventarioSucursalResponseDto(inventario),
      movimientos,
      total,
      page,
      limit
    };
  }

  /**
   * ✅ MODIFICADO: Al crear un inventario, se inicializa con un objeto de stock vacío.
   */
 async sincronizarConInventarioTienda(productoId: number, tiendaId: number): Promise<any> {
    const inventarioTienda = await this.prisma.inventarioTienda.findUnique({
      where: { productoId_tiendaId: { productoId, tiendaId } }
    });

    if (!inventarioTienda) {
      throw new NotFoundException('No se encontró inventario en la tienda principal');
    }

    const sucursales = await this.prisma.sucursal.findMany({
      where: { tiendaId }
    });

    // 👇 ESTA ES LA LÍNEA CORREGIDA 👇
    // Le decimos a TypeScript que 'resultados' será un array de objetos con esta forma.
    const resultados: { sucursal: string; inventario: InventarioSucursalResponseDto; }[] = [];

    for (const sucursal of sucursales) {
      // Usamos 'upsert' para crear el inventario si no existe, o simplemente encontrarlo si ya existe.
      // Es más eficiente que buscar y luego crear.
      const inventario = await this.prisma.inventarioSucursal.upsert({
        where: {
          productoId_sucursalId: {
            productoId,
            sucursalId: sucursal.id,
          },
        },
        update: {}, // No hacemos ninguna actualización si ya existe
        create: {
          productoId,
          sucursalId: sucursal.id,
          tiendaId,
          stock: {}, // Se inicializa con un objeto de stock vacío
          stockMinimo: inventarioTienda.stockMinimo,
        },
      });

      // Ahora el .push() es válido porque el objeto coincide con el tipo del array
      resultados.push({
        sucursal: sucursal.nombre,
        inventario: new InventarioSucursalResponseDto(inventario)
      });
    }

    return {
      message: 'Sincronización completada',
      resultados
    };
  }
}