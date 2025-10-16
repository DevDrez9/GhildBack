import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';

import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { ProveedorTiendaDto } from './dto/proveedor-tienda.dto';
import { ProveedorResponseDto, ProveedorTiendaResponseDto } from './dto/proveedor-response.dto';
import { FilterProveedorDto } from './dto/filter-proveedor.dto';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from 'generated/prisma/client';

@Injectable()
export class ProveedorService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProveedorDto: CreateProveedorDto): Promise<ProveedorResponseDto> {
    const { ...proveedorData } = createProveedorDto;

   
    try {
      const proveedor = await this.prisma.proveedor.create({
        data: proveedorData,
       include: {
          tiendas: {
            include: {
              tienda: true
            }
          },
          productos: {
            take: 5,
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      const totalProductos = await this.prisma.producto.count({
        where: { proveedorId: proveedor.id }
      });

      return new ProveedorResponseDto(proveedor, totalProductos);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Error al crear el proveedor');
        }
      }
      throw error;
    }
  }
async findAll(filterProveedorDto: FilterProveedorDto = {}): Promise<ProveedorResponseDto[]> {
    const { search, activo, ruc } = filterProveedorDto;

    const where: Prisma.ProveedorWhereInput = {};

    // ⭐ CLAVE: Solo aplica el filtro si 'activo' es estrictamente true ⭐
    if (activo === true) {
        where.activo = true; 
    }
    // Si activo es false, undefined, o null, la condición es falsa
    // y no se añade ningún filtro por estado, devolviendo todos.
    
    // Lógica para el filtro 'search' (se mantiene igual)
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { contacto: { contains: search, mode: 'insensitive' } },
        { email: { contains: search } }
      ] as Prisma.ProveedorWhereInput['OR'];
    }

    const proveedores = await this.prisma.proveedor.findMany({
      where, 
      include: {
        tiendas: {
          include: {
            tienda: true
          }
        },
        productos: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { nombre: 'asc' }
    });

    const proveedoresConTotal = await Promise.all(
      proveedores.map(async (proveedor) => {
        const totalProductos = await this.prisma.producto.count({
          where: { proveedorId: proveedor.id }
        });
        return new ProveedorResponseDto(proveedor, totalProductos);
      })
    );

    return proveedoresConTotal;
}
async findAllMinimo(filterProveedorDto: FilterProveedorDto = {}): Promise<ProveedorResponseDto[]> {
  const { search, activo, ruc } = filterProveedorDto;

  const where: Prisma.ProveedorWhereInput = {};

  // Filtro por activo (si se proporciona)
  

  

  // Filtro de búsqueda (solo si se proporciona y no está vacío)
  if (search && search.trim() !== '') {
    where.OR = [
      { nombre: { contains: search} },
      { contacto: { contains: search} },
      { email: { contains: search} },
      { direccion: { contains: search} },
      { telefono: { contains: search} },
      { ruc: { contains: search} }
    ];
  }

  console.log('Where clause for proveedores:', JSON.stringify(where, null, 2));

  const proveedores = await this.prisma.proveedor.findMany({
    where,
    orderBy: { nombre: 'asc' }
  });

  console.log('Proveedores encontrados:', proveedores.length);

  return proveedores.map(proveedor => new ProveedorResponseDto(proveedor));
}


  async findOne(id: number): Promise<ProveedorResponseDto> {
    const proveedor = await this.prisma.proveedor.findUnique({
      where: { id },
      include: {
        tiendas: {
          include: {
            tienda: {
              include: {
                configWeb: true
              }
            }
          }
        },
        productos: {
          include: {
            categoria: true,
            subcategoria: true,
            imagenes: {
              take: 1,
              orderBy: { orden: 'asc' }
            }
          }
        },
        compras: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: {
                producto: true
              }
            }
          }
        }
      }
    });

    if (!proveedor) {
      throw new NotFoundException(`Proveedor con ID ${id} no encontrado`);
    }

    const totalProductos = await this.prisma.producto.count({
      where: { proveedorId: id }
    });

    return new ProveedorResponseDto(proveedor, totalProductos);
  }
/*
  async findByRuc(ruc: string): Promise<ProveedorResponseDto> {
    const proveedor = await this.prisma.proveedor.findUnique({
      where: { ruc },
      include: {
        tiendas: {
          include: {
            tienda: true
          }
        },
        productos: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!proveedor) {
      throw new NotFoundException(`Proveedor con RUC ${ruc} no encontrado`);
    }

    const totalProductos = await this.prisma.producto.count({
      where: { proveedorId: proveedor.id }
    });

    return new ProveedorResponseDto(proveedor, totalProductos);
  }
*/
  async update(id: number, updateProveedorDto: UpdateProveedorDto): Promise<ProveedorResponseDto> {
    const proveedor = await this.findOne(id);

    const { ...proveedorData } = updateProveedorDto;

   
    try {
      const updatedProveedor = await this.prisma.proveedor.update({
        where: { id },
        data: proveedorData,
        include: {
          tiendas: {
            include: {
              tienda: true
            }
          },
          productos: {
            take: 5,
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      const totalProductos = await this.prisma.producto.count({
        where: { proveedorId: id }
      });

      return new ProveedorResponseDto(updatedProveedor, totalProductos);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Error al actualizar el proveedor');
        }
      }
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    const proveedor = await this.findOne(id);

    // Verificar si el proveedor tiene productos
    const totalProductos = await this.prisma.producto.count({
      where: { proveedorId: id }
    });

    if (totalProductos > 0) {
      throw new ConflictException('No se puede eliminar un proveedor que tiene productos asociados');
    }

    // Verificar si el proveedor tiene compras
    const totalCompras = await this.prisma.compraProveedor.count({
      where: { proveedorId: id }
    });

    if (totalCompras > 0) {
      throw new ConflictException('No se puede eliminar un proveedor que tiene historial de compras');
    }

    // Eliminar relaciones con tiendas primero
    await this.prisma.proveedorTienda.deleteMany({
      where: { proveedorId: id }
    });

    await this.prisma.proveedor.delete({
      where: { id }
    });
  }

  async addTiendaToProveedor(proveedorTiendaDto: ProveedorTiendaDto): Promise<ProveedorTiendaResponseDto> {
    const { proveedorId, tiendaId } = proveedorTiendaDto;

    // Verificar que el proveedor existe
    await this.findOne(proveedorId);

    // Verificar que la tienda existe
    const tienda = await this.prisma.tienda.findUnique({
      where: { id: tiendaId }
    });

    if (!tienda) {
      throw new NotFoundException(`Tienda con ID ${tiendaId} no encontrada`);
    }

    try {
      const proveedorTienda = await this.prisma.proveedorTienda.create({
        data: {
          proveedorId,
          tiendaId
        },
        include: {
          proveedor: {
            select: {
              id: true,
              nombre: true
            }
          },
          tienda: {
            select: {
              id: true,
              nombre: true,
              dominio: true
            }
          }
        }
      });

      return new ProveedorTiendaResponseDto(proveedorTienda);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('El proveedor ya está asociado a esta tienda');
        }
      }
      throw error;
    }
  }

  async removeTiendaFromProveedor(proveedorId: number, tiendaId: number): Promise<void> {
    const proveedorTienda = await this.prisma.proveedorTienda.findUnique({
      where: {
        proveedorId_tiendaId: {
          proveedorId,
          tiendaId
        }
      }
    });

    if (!proveedorTienda) {
      throw new NotFoundException('La relación proveedor-tienda no existe');
    }

    await this.prisma.proveedorTienda.delete({
      where: {
        proveedorId_tiendaId: {
          proveedorId,
          tiendaId
        }
      }
    });
  }

  async getTiendasByProveedor(proveedorId: number): Promise<ProveedorTiendaResponseDto[]> {
    await this.findOne(proveedorId); // Verificar que el proveedor existe

    const proveedorTiendas = await this.prisma.proveedorTienda.findMany({
      where: { proveedorId },
      include: {
        tienda: true
      }
    });

    return proveedorTiendas.map(pt => new ProveedorTiendaResponseDto(pt));
  }

  async getProveedoresByTienda(tiendaId: number): Promise<ProveedorResponseDto[]> {
    // Verificar que la tienda existe
    const tienda = await this.prisma.tienda.findUnique({
      where: { id: tiendaId }
    });

    if (!tienda) {
      throw new NotFoundException(`Tienda con ID ${tiendaId} no encontrada`);
    }

    const proveedorTiendas = await this.prisma.proveedorTienda.findMany({
      where: { tiendaId },
      include: {
        proveedor: {
          include: {
            tiendas: {
              include: {
                tienda: true
              }
            },
            productos: {
              take: 5,
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      }
    });

    const proveedoresConTotal = await Promise.all(
      proveedorTiendas.map(async (pt) => {
        const totalProductos = await this.prisma.producto.count({
          where: { proveedorId: pt.proveedorId }
        });
        return new ProveedorResponseDto(pt.proveedor, totalProductos);
      })
    );

    return proveedoresConTotal;
  }

  async getEstadisticas(id: number): Promise<any> {
    const proveedor = await this.findOne(id);

    const [
      totalProductos,
      productosActivos,
      productosInactivos,
      totalCompras,
      comprasEsteMes,
      comprasPorEstado
    ] = await Promise.all([
      this.prisma.producto.count({ where: { proveedorId: id } }),
      this.prisma.producto.count({ 
        where: { 
          proveedorId: id,
          stock: { gt: 0 }
        }
      }),
      this.prisma.producto.count({ 
        where: { 
          proveedorId: id,
          stock: { lte: 0 }
        }
      }),
      this.prisma.compraProveedor.count({ where: { proveedorId: id } }),
      this.prisma.compraProveedor.count({
        where: { 
          proveedorId: id,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      this.prisma.compraProveedor.groupBy({
        by: ['estado'],
        where: { proveedorId: id },
        _count: { _all: true },
        _sum: { total: true }
      })
    ]);

    return {
      proveedor: new ProveedorResponseDto(proveedor, totalProductos),
      estadisticas: {
        totalProductos,
        productosActivos,
        productosInactivos,
        totalCompras,
        comprasEsteMes,
        comprasPorEstado,
        porcentajeActivos: totalProductos > 0 ? (productosActivos / totalProductos) * 100 : 0
      }
    };
  }

  async getProductosByProveedor(proveedorId: number): Promise<any> {
    await this.findOne(proveedorId); // Verificar que el proveedor existe

    const productos = await this.prisma.producto.findMany({
      where: { proveedorId },
      include: {
        categoria: true,
        subcategoria: true,
        imagenes: {
          take: 1,
          orderBy: { orden: 'asc' }
        },
        inventarioTienda: true,
        inventarioSucursales: {
          include: {
            sucursal: true
          }
        }
      },
      orderBy: { nombre: 'asc' }
    });

    const proveedor = await this.prisma.proveedor.findUnique({
      where: { id: proveedorId },
      select: {
        id: true,
        nombre: true
      }
    });

    return {
      proveedor,
      productos,
      total: productos.length
    };
  }
}