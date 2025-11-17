import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma.service';
import { DecimalUtil } from '../utils/decimal.util';

// DTOs
import { CreateInventarioTiendaDto } from './dto/create-inventario-tienda.dto';
import { UpdateInventarioTiendaDto } from './dto/update-inventario-tienda.dto';
import { AjusteInventarioDto } from './dto/ajuste-inventario.dto';
import { InventarioTiendaResponseDto } from './dto/inventario-tienda-response.dto';
import { FilterInventarioTiendaDto } from './dto/filter-inventario-tienda.dto';
import { InventarioSucursalResponseDto } from 'src/inventario-sucursal/dto/inventario-sucursal-response.dto';

/**
 * Función de ayuda para calcular el stock total a partir de un objeto de stock por tallas.
 * @param stock Objeto JSON de Prisma.
 * @returns La suma total de unidades.
 */
const calcularStockTotal = (stock: Prisma.JsonValue): number => {
    if (typeof stock === 'object' && stock !== null && !Array.isArray(stock)) {
      const stockComoObjetoNumerico = stock as Record<string, number>;
        return Object.values(stockComoObjetoNumerico).reduce((sum, current) => sum + (current || 0), 0);
    }
    return 0;
};

@Injectable()
export class InventarioTiendaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createInventarioTiendaDto: CreateInventarioTiendaDto): Promise<InventarioTiendaResponseDto> {
    const { productoId, tiendaId, stock, ...inventarioData } = createInventarioTiendaDto;

    const producto = await this.prisma.producto.findUnique({ where: { id: productoId } });
    if (!producto) {
      throw new NotFoundException(`Producto con ID ${productoId} no encontrado`);
    }

    const tienda = await this.prisma.tienda.findUnique({ where: { id: tiendaId } });
    if (!tienda) {
      throw new NotFoundException(`Tienda con ID ${tiendaId} no encontrada`);
    }

    const existingInventario = await this.prisma.inventarioTienda.findUnique({
      where: { productoId_tiendaId: { productoId, tiendaId } },
    });
    if (existingInventario) {
      throw new ConflictException('Ya existe un registro de inventario para este producto en la tienda');
    }
    
    const inventario = await this.prisma.inventarioTienda.create({
      data: {
        ...inventarioData,
        stock: stock || {}, // Guarda un objeto vacío si no se provee
        producto: { connect: { id: productoId } },
        tienda: { connect: { id: tiendaId } },
      },
      include: {
        producto: { include: { categoria: true, imagenes: { take: 1, orderBy: { orden: 'asc' } } } },
        tienda: true,
      },
    });

    return new InventarioTiendaResponseDto(inventario);
  }

  async findAll(filterInventarioTiendaDto: FilterInventarioTiendaDto = {}): Promise<{ inventarios: InventarioTiendaResponseDto[], total: number }> {
    const { productoId, tiendaId, bajoStock, sinStock, page = 1, limit = 10 } = filterInventarioTiendaDto;
    const pageNumber = Math.max(1, parseInt(page as any) || 1);
    const limitNumber = Math.max(1, parseInt(limit as any) || 10);

    const baseWhere: Prisma.InventarioTiendaWhereInput = {};
    if (productoId) baseWhere.productoId = productoId;
    if (tiendaId) baseWhere.tiendaId = tiendaId;

    const todosLosInventarios = await this.prisma.inventarioTienda.findMany({
        where: baseWhere,
        include: {
          producto: { include: { categoria: true, subcategoria: true, imagenes: { take: 1, orderBy: { orden: 'asc' } } } },
          tienda: true,
        },
        orderBy: { producto: { nombre: 'asc' } }
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
      inventarios: paginatedInventarios.map(inv => new InventarioTiendaResponseDto(inv)),
      total,
    };
  }

  async findOne(id: number): Promise<InventarioTiendaResponseDto> {
    const inventario = await this.prisma.inventarioTienda.findUnique({
      where: { id },
      include: {
        producto: { include: { categoria: true, subcategoria: true, imagenes: true, proveedor: true } },
        tienda: { include: { configWeb: true } },
        movimientoInventario: { take: 10, orderBy: { createdAt: 'desc' }, include: { usuario: { select: { id: true, nombre: true, email: true } } } },
      },
    });
    if (!inventario) {
      throw new NotFoundException(`Inventario con ID ${id} no encontrado`);
    }
    return new InventarioTiendaResponseDto(inventario);
  }

  async findByProductoAndTienda(productoId: number, tiendaId: number): Promise<InventarioTiendaResponseDto> {
    const inventario = await this.prisma.inventarioTienda.findUnique({
      where: { productoId_tiendaId: { productoId, tiendaId } },
      include: {
        producto: { include: { categoria: true, imagenes: { take: 1, orderBy: { orden: 'asc' } } } },
        tienda: true,
      },
    });
    if (!inventario) {
      throw new NotFoundException('No se encontró inventario para el producto en la tienda especificada');
    }
    return new InventarioTiendaResponseDto(inventario);
  }

  /**
   * MODIFICADO: Esta función ahora solo actualiza campos que no son de stock.
   * Para ajustar el stock, se debe usar el método `ajustarStock`.
   */
  async update(id: number, updateDto: UpdateInventarioTiendaDto): Promise<InventarioTiendaResponseDto> {
    await this.findOne(id);

    // Excluir el campo 'stock' del DTO para evitar actualizaciones incorrectas
    const { stock, ...dataToUpdate } = updateDto;
    if (stock) {
        throw new BadRequestException("Para modificar el stock, utilice el endpoint de ajuste de inventario.");
    }
    
    const updatedInventario = await this.prisma.inventarioTienda.update({
      where: { id },
      data: dataToUpdate,
      include: { /* ... tus includes ... */ },
    });

    return new InventarioTiendaResponseDto(updatedInventario);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    const totalMovimientos = await this.prisma.movimientoInventario.count({ where: { inventarioTiendaId: id } });
    if (totalMovimientos > 0) {
      throw new ConflictException('No se puede eliminar el inventario porque tiene movimientos asociados');
    }
    await this.prisma.inventarioTienda.delete({ where: { id } });
  }

  async ajustarStock(id: number, ajusteInventarioDto: AjusteInventarioDto, usuarioId?: number): Promise<InventarioTiendaResponseDto> {
    const { cantidad, motivo, observaciones } = ajusteInventarioDto;

    if (Object.keys(cantidad).length === 0) {
      throw new BadRequestException('El objeto de ajuste por talla no puede estar vacío.');
    }

    return this.prisma.$transaction(async (prisma) => {
      const inventarioActual = await prisma.inventarioTienda.findUnique({ where: { id } });
      if (!inventarioActual) {
        throw new NotFoundException(`Inventario con ID ${id} no encontrado`);
      }

      const stockAnterior = (inventarioActual.stock as Record<string, number>) || {};
      const stockNuevo = { ...stockAnterior };

      for (const talla in cantidad) {
        const ajuste = cantidad[talla];
        stockNuevo[talla] = (stockNuevo[talla] || 0) + ajuste;
        if (stockNuevo[talla] < 0) {
          throw new BadRequestException(`El ajuste resultaría en stock negativo para la talla ${talla}.`);
        }
        if (stockNuevo[talla] === 0) {
          delete stockNuevo[talla];
        }
      }

      const inventarioActualizado = await prisma.inventarioTienda.update({
        where: { id },
        data: { stock: stockNuevo },
        include: {
          producto: { include: { categoria: true, imagenes: { take: 1, orderBy: { orden: 'asc' } } } },
          tienda: true,
        },
      });

      await prisma.movimientoInventario.create({
        data: {
          tipo: 'AJUSTE_FABRICA',
          cantidad: cantidad,
          productoId: inventarioActual.productoId,
          motivo: `${motivo}: ${observaciones || 'Sin observaciones'}`,
          usuarioId,
          inventarioTiendaId: id,
          stockAnterior,
          stockNuevo,
        },
      });

      return new InventarioTiendaResponseDto(inventarioActualizado);
    });
  }

  async transferirStockSucursal(origenId: number, destinoId: number, cantidad: Record<string, number>, motivo: string, usuarioId?: number): Promise<any> {
    if (Object.values(cantidad).some(qty => qty <= 0)) {
        throw new BadRequestException('Las cantidades a transferir deben ser mayores a cero.');
    }

    return this.prisma.$transaction(async (prisma) => {
        const inventarioOrigen = await prisma.inventarioTienda.findUnique({ where: { id: origenId } });
        const inventarioDestino = await prisma.inventarioSucursal.findUnique({ where: { id: destinoId } });
        
        if (!inventarioOrigen || !inventarioDestino) {
            throw new NotFoundException('No se encontró el inventario de origen o destino.');
        }
        if (inventarioOrigen.productoId !== inventarioDestino.productoId) {
            throw new BadRequestException('La transferencia debe ser del mismo producto.');
        }

        const stockOrigen = (inventarioOrigen.stock as Record<string, number>) || {};
        const stockDestino = (inventarioDestino.stock as Record<string, number>) || {};
        const nuevoStockOrigen = { ...stockOrigen };
        const nuevoStockDestino = { ...stockDestino };
        
        for (const talla in cantidad) {
            const qty = cantidad[talla];
            if ((nuevoStockOrigen[talla] || 0) < qty) {
                throw new BadRequestException(`Stock insuficiente para la talla ${talla} en el origen.`);
            }
            nuevoStockOrigen[talla] -= qty;
            if (nuevoStockOrigen[talla] === 0) delete nuevoStockOrigen[talla];
            nuevoStockDestino[talla] = (nuevoStockDestino[talla] || 0) + qty;
        }

        const origenActualizado = await prisma.inventarioTienda.update({
            where: { id: origenId },
            data: { stock: nuevoStockOrigen }
        });

        const destinoActualizado = await prisma.inventarioSucursal.update({
            where: { id: destinoId },
            data: { stock: nuevoStockDestino }
        });

        // Crear Movimientos
        await prisma.movimientoInventario.create({
            data: {
                tipo: 'TRANSFERENCIA_SALIDA',
                cantidad,
                productoId: inventarioOrigen.productoId,
                motivo: `Transferencia a Sucursal #${destinoId}: ${motivo}`,
                usuarioId,
                inventarioTiendaId: origenId,
                stockAnterior: stockOrigen,
                stockNuevo: nuevoStockOrigen,
            }
        });

        await prisma.movimientoInventario.create({
            data: {
                tipo: 'TRANSFERENCIA_ENTRADA',
                cantidad,
                productoId: inventarioDestino.productoId,
                motivo: `Transferencia desde Tienda #${origenId}: ${motivo}`,
                usuarioId,
                inventarioSucursalId: destinoId,
                stockAnterior: stockDestino,
                stockNuevo: nuevoStockDestino,
            }
        });

        return {
            message: 'Transferencia Tienda a Sucursal realizada exitosamente',
            origen: new InventarioTiendaResponseDto(origenActualizado),
            destino: new InventarioSucursalResponseDto(destinoActualizado),
        };
    });
  }

  /**
   * CORREGIDO: Lógica de filtrado actualizada para usar `calcularStockTotal`.
   */
  async getProductosBajoStock(tiendaId?: number): Promise<{ inventarios: InventarioTiendaResponseDto[], total: number }> {
    const where: Prisma.InventarioTiendaWhereInput = {};
    if (tiendaId) where.tiendaId = tiendaId;
  
    const allInventarios = await this.prisma.inventarioTienda.findMany({
      where,
      include: { /* ... tus includes ... */ },
    });
  
    const inventariosBajoStock = allInventarios.filter(inv => {
      const total = calcularStockTotal(inv.stock);
      return total > 0 && total <= (inv.stockMinimo || 5);
    });
  
    return {
      inventarios: inventariosBajoStock.map(inv => new InventarioTiendaResponseDto(inv)),
      total: inventariosBajoStock.length,
    };
  }

  /**
   * CORREGIDO: Lógica de filtrado actualizada para usar `calcularStockTotal`.
   */
  async getProductosSinStock(tiendaId?: number): Promise<{ inventarios: InventarioTiendaResponseDto[], total: number }> {
    const where: Prisma.InventarioTiendaWhereInput = {};
    if (tiendaId) where.tiendaId = tiendaId;
  
    const allInventarios = await this.prisma.inventarioTienda.findMany({
      where,
      include: { /* ... tus includes ... */ },
    });
  
    const inventariosSinStock = allInventarios.filter(inv => calcularStockTotal(inv.stock) === 0);
  
    return {
      inventarios: inventariosSinStock.map(inv => new InventarioTiendaResponseDto(inv)),
      total: inventariosSinStock.length,
    };
  }

  async getEstadisticas(tiendaId?: number): Promise<any> {
    const where: Prisma.InventarioTiendaWhereInput = {};
    if (tiendaId) where.tiendaId = tiendaId;

    const allInventarios = await this.prisma.inventarioTienda.findMany({
        where,
        include: { producto: { select: { precio: true } } }
    });
    
    let productosConStock = 0;
    let productosSinStock = 0;
    let productosBajoStock = 0;
    let valorTotal = 0;

    allInventarios.forEach(inv => {
        const total = calcularStockTotal(inv.stock);
        if (total > 0) {
            productosConStock++;
            if (total <= (inv.stockMinimo || 5)) {
                productosBajoStock++;
            }
        } else {
            productosSinStock++;
        }
        const precio = DecimalUtil.toNumber(inv.producto.precio);
        valorTotal += precio * total;
    });

    const totalProductos = allInventarios.length;
    return {
      totalProductos,
      productosConStock,
      productosSinStock,
      productosBajoStock,
      valorTotalInventario: valorTotal,
      porcentajeConStock: totalProductos > 0 ? (productosConStock / totalProductos) * 100 : 0,
      porcentajeBajoStock: totalProductos > 0 ? (productosBajoStock / totalProductos) * 100 : 0,
    };
  }

  async getMovimientos(inventarioId: number, page: number = 1, limit: number = 10): Promise<any> {
    const inventario = await this.findOne(inventarioId);
    const [movimientos, total] = await Promise.all([
      this.prisma.movimientoInventario.findMany({
        where: { inventarioTiendaId: inventarioId },
        include: { /* ... tus includes ... */ },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.movimientoInventario.count({ where: { inventarioTiendaId: inventarioId } }),
    ]);

    return {
      inventario: new InventarioTiendaResponseDto(inventario),
      movimientos,
      total,
      page,
      limit,
    };
  }
  
  async findOneSucursal(id: number): Promise<InventarioSucursalResponseDto> {
    const inventario = await this.prisma.inventarioSucursal.findUnique({
      where: { id },
      include: { /* ... tus includes ... */ },
    });
    if (!inventario) {
      throw new NotFoundException(`Inventario de sucursal con ID ${id} no encontrado`);
    }
    return new InventarioSucursalResponseDto(inventario);
  }
}