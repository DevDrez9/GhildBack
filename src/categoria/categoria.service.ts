import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';

import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { CategoriaResponseDto, SubcategoriaResponseDto } from './dto/categoria-response.dto';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from 'generated/prisma/client';

@Injectable()
export class CategoriaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCategoriaDto: CreateCategoriaDto): Promise<CategoriaResponseDto> {
    const { tiendaId, ...categoriaData } = createCategoriaDto;

    // Verificar que la tienda existe
    const tienda = await this.prisma.tienda.findUnique({
      where: { id: tiendaId }
    });

    if (!tienda) {
      throw new NotFoundException(`Tienda con ID ${tiendaId} no encontrada`);
    }

    // Verificar si la categoría ya existe en esta tienda
    const existingCategoria = await this.prisma.categoria.findFirst({
      where: {
        nombre: categoriaData.nombre,
        tiendaId
      }
    });

    if (existingCategoria) {
      throw new ConflictException('Ya existe una categoría con este nombre en la tienda');
    }

    try {
      const categoria = await this.prisma.categoria.create({
        data: {
          ...categoriaData,
          tienda: {
            connect: { id: tiendaId }
          }
        },
        include: {
          tienda: true,
          subcategorias: true,
          productos: {
            take: 5,
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      const totalProductos = await this.prisma.producto.count({
        where: { categoriaId: categoria.id }
      });

      return new CategoriaResponseDto(categoria, totalProductos);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Error al crear la categoría');
        }
      }
      throw error;
    }
  }

  async findAll(tiendaId?: number): Promise<CategoriaResponseDto[]> {
    const where: Prisma.CategoriaWhereInput = {};
    
    if (tiendaId) {
      where.tiendaId = tiendaId;
    }

    const categorias = await this.prisma.categoria.findMany({
      where,
      include: {
        tienda: true,
        subcategorias: true,
        productos: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { nombre: 'asc' }
    });

    // Obtener el total de productos por categoría
    const categoriasConTotal = await Promise.all(
      categorias.map(async (categoria) => {
        const totalProductos = await this.prisma.producto.count({
          where: { categoriaId: categoria.id }
        });
        return new CategoriaResponseDto(categoria, totalProductos);
      })
    );

    return categoriasConTotal;
  }

  async findOne(id: number): Promise<CategoriaResponseDto> {
    const categoria = await this.prisma.categoria.findUnique({
      where: { id },
      include: {
        tienda: {
          include: {
            configWeb: true
          }
        },
        subcategorias: {
          include: {
            productos: {
              take: 5,
              orderBy: { createdAt: 'desc' }
            }
          }
        },
        productos: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            imagenes: {
              take: 1,
              orderBy: { orden: 'asc' }
            },
            subcategoria: true
          }
        }
      }
    });

    if (!categoria) {
      throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
    }

    const totalProductos = await this.prisma.producto.count({
      where: { categoriaId: id }
    });

    return new CategoriaResponseDto(categoria, totalProductos);
  }

  async findByTienda(tiendaId: number): Promise<CategoriaResponseDto[]> {
    // Verificar que la tienda existe
    const tienda = await this.prisma.tienda.findUnique({
      where: { id: tiendaId }
    });

    if (!tienda) {
      throw new NotFoundException(`Tienda con ID ${tiendaId} no encontrada`);
    }

    const categorias = await this.prisma.categoria.findMany({
      where: { tiendaId },
      include: {
        subcategorias: true,
        productos: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { nombre: 'asc' }
    });

    const categoriasConTotal = await Promise.all(
      categorias.map(async (categoria) => {
        const totalProductos = await this.prisma.producto.count({
          where: { categoriaId: categoria.id }
        });
        return new CategoriaResponseDto(categoria, totalProductos);
      })
    );

    return categoriasConTotal;
  }

  async update(id: number, updateCategoriaDto: UpdateCategoriaDto): Promise<CategoriaResponseDto> {
    const categoria = await this.findOne(id); // Verificar que existe

    const { tiendaId, ...categoriaData } = updateCategoriaDto;

    // Si se quiere cambiar la tienda, verificar que existe
    if (tiendaId && tiendaId !== categoria.tiendaId) {
      const tienda = await this.prisma.tienda.findUnique({
        where: { id: tiendaId }
      });

      if (!tienda) {
        throw new NotFoundException(`Tienda con ID ${tiendaId} no encontrada`);
      }
    }

    try {
      const updatedCategoria = await this.prisma.categoria.update({
        where: { id },
        data: {
          ...categoriaData,
          ...(tiendaId && { tiendaId })
        },
        include: {
          tienda: true,
          subcategorias: true,
          productos: {
            take: 5,
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      const totalProductos = await this.prisma.producto.count({
        where: { categoriaId: id }
      });

      return new CategoriaResponseDto(updatedCategoria, totalProductos);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Ya existe una categoría con este nombre en la tienda');
        }
      }
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    const categoria = await this.findOne(id); // Verificar que existe

    // Verificar si la categoría tiene productos
    const totalProductos = await this.prisma.producto.count({
      where: { categoriaId: id }
    });

    if (totalProductos > 0) {
      throw new ConflictException('No se puede eliminar una categoría que tiene productos');
    }

    // Verificar si la categoría tiene subcategorías
    const totalSubcategorias = await this.prisma.subcategoria.count({
      where: { categoriaId: id }
    });

    if (totalSubcategorias > 0) {
      throw new ConflictException('No se puede eliminar una categoría que tiene subcategorías');
    }

    await this.prisma.categoria.delete({
      where: { id }
    });
  }

  async getCategoriasConProductos(tiendaId?: number): Promise<CategoriaResponseDto[]> {
    const where: Prisma.CategoriaWhereInput = {};
    
    if (tiendaId) {
      where.tiendaId = tiendaId;
    }

    // Solo categorías que tienen productos
    where.productos = {
      some: {
        stock: { gt: 0 }
      }
    };

    const categorias = await this.prisma.categoria.findMany({
      where,
      include: {
        tienda: true,
        subcategorias: {
          include: {
            productos: {
              where: { stock: { gt: 0 } },
              take: 5
            }
          }
        },
        productos: {
          where: { stock: { gt: 0 } },
          take: 8,
          orderBy: { createdAt: 'desc' },
          include: {
            imagenes: {
              take: 1,
              orderBy: { orden: 'asc' }
            }
          }
        }
      },
      orderBy: { nombre: 'asc' }
    });

    const categoriasConTotal = await Promise.all(
      categorias.map(async (categoria) => {
        const totalProductos = await this.prisma.producto.count({
          where: { 
            categoriaId: categoria.id,
            stock: { gt: 0 }
          }
        });
        return new CategoriaResponseDto(categoria, totalProductos);
      })
    );

    return categoriasConTotal;
  }

  async getEstadisticas(id: number): Promise<any> {
    const categoria = await this.findOne(id);

    const [
      totalProductos,
      totalSubcategorias,
      productosConStock,
      productosSinStock,
      productosDestacados
    ] = await Promise.all([
      this.prisma.producto.count({ where: { categoriaId: id } }),
      this.prisma.subcategoria.count({ where: { categoriaId: id } }),
      this.prisma.producto.count({ 
        where: { 
          categoriaId: id,
          stock: { gt: 0 }
        }
      }),
      this.prisma.producto.count({ 
        where: { 
          categoriaId: id,
          stock: { lte: 0 }
        }
      }),
      this.prisma.producto.count({ 
        where: { 
          categoriaId: id,
          esDestacado: true
        }
      })
    ]);

    return {
      categoria: new CategoriaResponseDto(categoria, totalProductos),
      estadisticas: {
        totalProductos,
        totalSubcategorias,
        productosConStock,
        productosSinStock,
        productosDestacados,
        porcentajeConStock: totalProductos > 0 ? (productosConStock / totalProductos) * 100 : 0
      }
    };
  }
}