import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

import { CreateSucursalDto } from './dto/create-sucursal.dto';
import { UpdateSucursalDto } from './dto/update-sucursal.dto';
import { SucursalResponseDto } from './dto/sucursal-response.dto';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from 'generated/prisma/client';

@Injectable()
export class SucursalService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSucursalDto: CreateSucursalDto): Promise<SucursalResponseDto> {
    const { tiendaId, ...sucursalData } = createSucursalDto;

    // Verificar que la tienda existe
    const tienda = await this.prisma.tienda.findUnique({
      where: { id: tiendaId }
    });

    if (!tienda) {
      throw new NotFoundException(`Tienda con ID ${tiendaId} no encontrada`);
    }

    try {
      const sucursal = await this.prisma.sucursal.create({
        data: {
          ...sucursalData,
          tienda: {
            connect: { id: tiendaId }
          }
        },
        include: {
          tienda: true,
          inventario: true,
          ventas: true
        }
      });

      return new SucursalResponseDto(sucursal);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          // Puedes agregar validaciones específicas si es necesario
          throw new ConflictException('Error al crear la sucursal');
        }
      }
      throw error;
    }
  }

  async findAll(): Promise<SucursalResponseDto[]> {
    const sucursales = await this.prisma.sucursal.findMany({
      
      include: {
        tienda: true,
        inventario: {
          include: {
            producto: true
          }
        },
        ventas: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            inventario: true,
            ventas: true,
            usuarioSucursal: true
          }
        }
      },
      orderBy: { nombre: 'asc' }
    });

    return sucursales.map(sucursal => new SucursalResponseDto(sucursal));
  }

  async findOne(id: number): Promise<any> {
    const sucursal = await this.prisma.sucursal.findUnique({
      where: { id },
      include: {
        tienda: {
          include: {
            configWeb: true
          }
        },
        inventario: {
          include: {
            producto: {
              include: {
                categoria: true,
                imagenes: true
              }
            }
          }
        },
        ventas: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: {
                producto: true
              }
            }
          }
        },
        usuarioSucursal: {
          include: {
            usuario: {
              select: {
                id: true,
                email: true,
                nombre: true,
                rol: true
              }
            }
          }
        },
        _count: {
          select: {
            inventario: true,
            ventas: true,
            usuarioSucursal: true
          }
        }
      }
    });

    if (!sucursal) {
      throw new NotFoundException(`Sucursal con ID ${id} no encontrada`);
    }

    return sucursal;
  }

  async findByTienda(tiendaId: number): Promise<SucursalResponseDto[]> {
    // Verificar que la tienda existe
    const tienda = await this.prisma.tienda.findUnique({
      where: { id: tiendaId }
    });

    if (!tienda) {
      throw new NotFoundException(`Tienda con ID ${tiendaId} no encontrada`);
    }

    const sucursales = await this.prisma.sucursal.findMany({
      where: { 
        tiendaId
      },
      include: {
        tienda: true,
        inventario: {
          include: {
            producto: true
          }
        },
        _count: {
          select: {
            inventario: true,
            ventas: true,
            usuarioSucursal: true
          }
        }
      },
      orderBy: { nombre: 'asc' }
    });

    return sucursales.map(sucursal => new SucursalResponseDto(sucursal));
  }

  async update(id: number, updateSucursalDto: UpdateSucursalDto): Promise<SucursalResponseDto> {
    await this.findOne(id); // Verificar que existe

    try {
      const sucursal = await this.prisma.sucursal.update({
        where: { id },
        data: updateSucursalDto,
        include: {
          tienda: true,
          inventario: true
        }
      });

      return new SucursalResponseDto(sucursal);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Error al actualizar la sucursal');
        }
      }
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id); // Verificar que existe

    // En lugar de eliminar, marcamos como inactiva
    await this.prisma.sucursal.update({
      where: { id },
      data: { activa: false }
    });
  }

 async getEstadisticas(id: number): Promise<any> {
    const sucursal = await this.findOne(id);

    // 1. Ejecutar consultas en paralelo
    const [
      totalProductos,
      totalVentas,
      totalUsuarios,
      ventasMensuales,
      allInventarios // ✅ CAMBIO: Traemos los registros, no el agregado
    ] = await Promise.all([
      this.prisma.inventarioSucursal.count({ 
        where: { sucursalId: id } 
      }),
      this.prisma.venta.count({ 
        where: { sucursalId: id } 
      }),
      this.prisma.usuarioSucursal.count({ 
        where: { sucursalId: id } 
      }),
      this.prisma.venta.groupBy({
        by: ['createdAt'],
        where: { 
          sucursalId: id,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Últimos 30 días
          }
        },
        _sum: {
          total: true
        }
      }),
      // ✅ CAMBIO: Traemos solo el campo stock de todos los items para sumar en memoria
      this.prisma.inventarioSucursal.findMany({
        where: { sucursalId: id },
        select: { stock: true }
      })
    ]);

    // ✅ CAMBIO: Calcular el stock total sumando los JSONs
    const stockTotalCalculado = allInventarios.reduce((total, inv) => {
        return total + calcularStockTotal(inv.stock);
    }, 0);

    return {
      sucursal: new SucursalResponseDto(sucursal),
      estadisticas: {
        totalProductos,
        totalVentas,
        totalUsuarios,
        ventasMensuales: ventasMensuales.reduce((total, venta) => 
          total + (venta._sum.total?.toNumber() || 0), 0
        ),
        stockTotal: stockTotalCalculado // ✅ Usamos el cálculo manual
      }
    };
  }

  // ✅ CAMBIO: 'cantidad' ahora es Record<string, number>
  async transferirProducto(
    sucursalOrigenId: number, 
    sucursalDestinoId: number, 
    productoId: number, 
    cantidadPorTalla: Record<string, number> 
  ): Promise<any> {
    
    if (sucursalOrigenId === sucursalDestinoId) {
      throw new BadRequestException('No se puede transferir a la misma sucursal');
    }

    // Validar que el objeto de cantidad no esté vacío
    if (Object.keys(cantidadPorTalla).length === 0 || Object.values(cantidadPorTalla).some(qty => qty <= 0)) {
      throw new BadRequestException('Las cantidades a transferir deben ser mayores a 0');
    }

    // 1. Verificar existencia en sucursal origen
    const inventarioOrigen = await this.prisma.inventarioSucursal.findUnique({
      where: {
        productoId_sucursalId: {
          productoId,
          sucursalId: sucursalOrigenId
        }
      }
    });

    if (!inventarioOrigen) {
      throw new BadRequestException('El producto no existe en la sucursal de origen');
    }

    // 2. Validar stock suficiente por talla en origen (En memoria)
    const stockOrigenActual = (inventarioOrigen.stock as Record<string, number>) || {};
    
    for (const talla in cantidadPorTalla) {
        const qtySolicitada = cantidadPorTalla[talla];
        const qtyDisponible = stockOrigenActual[talla] || 0;
        
        if (qtyDisponible < qtySolicitada) {
            throw new BadRequestException(`Stock insuficiente en origen para la talla ${talla}. Disponible: ${qtyDisponible}, Solicitado: ${qtySolicitada}`);
        }
    }

    // 3. Iniciar transacción
    return this.prisma.$transaction(async (prisma) => {
      
      // A. Calcular y actualizar Origen
      const nuevoStockOrigen = { ...stockOrigenActual };
      for (const talla in cantidadPorTalla) {
          nuevoStockOrigen[talla] -= cantidadPorTalla[talla];
          if (nuevoStockOrigen[talla] === 0) delete nuevoStockOrigen[talla];
      }

      await prisma.inventarioSucursal.update({
        where: { id: inventarioOrigen.id },
        data: { stock: nuevoStockOrigen }
      });

      // B. Calcular y actualizar Destino
      // Primero buscamos si ya existe el destino
      const inventarioDestino = await prisma.inventarioSucursal.findUnique({
        where: {
          productoId_sucursalId: {
            productoId,
            sucursalId: sucursalDestinoId
          }
        }
      });

      const stockDestinoActual = (inventarioDestino?.stock as Record<string, number>) || {};
      const nuevoStockDestino = { ...stockDestinoActual };

      for (const talla in cantidadPorTalla) {
          nuevoStockDestino[talla] = (nuevoStockDestino[talla] || 0) + cantidadPorTalla[talla];
      }

      // Usamos upsert para crear o actualizar
      await prisma.inventarioSucursal.upsert({
        where: {
            productoId_sucursalId: {
                productoId,
                sucursalId: sucursalDestinoId
            }
        },
        update: { stock: nuevoStockDestino },
        create: {
            productoId,
            sucursalId: sucursalDestinoId,
            tiendaId: inventarioOrigen.tiendaId,
            stock: nuevoStockDestino,
            stockMinimo: inventarioOrigen.stockMinimo || 5
        }
      });

      // C. Registrar movimientos (Opcional pero recomendado)
      // Aquí deberías insertar en `MovimientoInventario` tanto la salida de la sucursal 1 como la entrada a la sucursal 2
      // usando `cantidadPorTalla` como JSON.

      return {
        message: 'Transferencia realizada exitosamente',
        cantidad: cantidadPorTalla,
        productoId,
        sucursalOrigenId,
        sucursalDestinoId
      };
    });
  }

  async getInventario(sucursalId: number): Promise<any> {
    const sucursal = await this.findOne(sucursalId);

    const inventario = await this.prisma.inventarioSucursal.findMany({
      where: { sucursalId },
      include: {
        producto: {
          include: {
            categoria: true,
            subcategoria: true,
            imagenes: true
          }
        }
      },
      orderBy: { producto: { nombre: 'asc' } }
    });

    return {
      sucursal: new SucursalResponseDto(sucursal),
      inventario
    };
  }

  async getProductosBajoStock(sucursalId: number, stockMinimo: number = 5): Promise<any> {
    const sucursal = await this.findOne(sucursalId);

    const productosBajoStock = await this.prisma.inventarioSucursal.findMany({
      where: { 
        sucursalId,
        stock: { lte: stockMinimo }
      },
      include: {
        producto: {
          include: {
            categoria: true,
            imagenes: true
          }
        }
      },
      orderBy: { stock: 'asc' }
    });

    return {
      sucursal: new SucursalResponseDto(sucursal),
      productosBajoStock,
      total: productosBajoStock.length
    };
  }

}

const calcularStockTotal = (stock: Prisma.JsonValue): number => {
    if (typeof stock === 'object' && stock !== null && !Array.isArray(stock)) {
        return Object.values<number>(stock as Record<string, number>).reduce((sum, current) => sum + (current || 0), 0);
    }
    return 0;
};