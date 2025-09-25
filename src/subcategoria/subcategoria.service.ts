import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';

import { CreateSubcategoriaDto } from './dto/create-subcategoria.dto';
import { UpdateSubcategoriaDto } from './dto/update-subcategoria.dto';
import { SubcategoriaResponseDto } from './dto/subcategoria-response.dto';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from 'generated/prisma/client';

@Injectable()
export class SubcategoriaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSubcategoriaDto: CreateSubcategoriaDto): Promise<SubcategoriaResponseDto> {
    const { categoriaId, ...subcategoriaData } = createSubcategoriaDto;

    // Verificar que la categoría existe si se proporciona
    if (categoriaId) {
      const categoria = await this.prisma.categoria.findUnique({
        where: { id: categoriaId }
      });

      if (!categoria) {
        throw new NotFoundException(`Categoría con ID ${categoriaId} no encontrada`);
      }
    }

    try {
      const subcategoria = await this.prisma.subcategoria.create({
        data: {
          ...subcategoriaData,
          ...(categoriaId && {
            categoria: {
              connect: { id: categoriaId }
            }
          })
        },
        include: {
          categoria: {
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
        where: { subcategoriaId: subcategoria.id }
      });

      return new SubcategoriaResponseDto(subcategoria, totalProductos);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Error al crear la subcategoría');
        }
      }
      throw error;
    }
  }

  async findAll(categoriaId?: number): Promise<SubcategoriaResponseDto[]> {
    const where: Prisma.SubcategoriaWhereInput = {};
    
    if (categoriaId) {
      where.categoriaId = categoriaId;
    }

    const subcategorias = await this.prisma.subcategoria.findMany({
      where,
      include: {
        categoria: {
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

    // Obtener el total de productos por subcategoría
    const subcategoriasConTotal = await Promise.all(
      subcategorias.map(async (subcategoria) => {
        const totalProductos = await this.prisma.producto.count({
          where: { subcategoriaId: subcategoria.id }
        });
        return new SubcategoriaResponseDto(subcategoria, totalProductos);
      })
    );

    return subcategoriasConTotal;
  }

  async findOne(id: number): Promise<SubcategoriaResponseDto> {
    const subcategoria = await this.prisma.subcategoria.findUnique({
      where: { id },
      include: {
        categoria: {
          include: {
            tienda: true
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
            categoria: true
          }
        }
      }
    });

    if (!subcategoria) {
      throw new NotFoundException(`Subcategoría con ID ${id} no encontrada`);
    }

    const totalProductos = await this.prisma.producto.count({
      where: { subcategoriaId: id }
    });

    return new SubcategoriaResponseDto(subcategoria, totalProductos);
  }

  async findByCategoria(categoriaId: number): Promise<SubcategoriaResponseDto[]> {
    // Verificar que la categoría existe
    const categoria = await this.prisma.categoria.findUnique({
      where: { id: categoriaId }
    });

    if (!categoria) {
      throw new NotFoundException(`Categoría con ID ${categoriaId} no encontrada`);
    }

    const subcategorias = await this.prisma.subcategoria.findMany({
      where: { categoriaId },
      include: {
        categoria: true,
        productos: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { nombre: 'asc' }
    });

    const subcategoriasConTotal = await Promise.all(
      subcategorias.map(async (subcategoria) => {
        const totalProductos = await this.prisma.producto.count({
          where: { subcategoriaId: subcategoria.id }
        });
        return new SubcategoriaResponseDto(subcategoria, totalProductos);
      })
    );

    return subcategoriasConTotal;
  }

  async update(id: number, updateSubcategoriaDto: UpdateSubcategoriaDto): Promise<SubcategoriaResponseDto> {
    const subcategoria = await this.findOne(id); // Verificar que existe

    const { categoriaId, ...subcategoriaData } = updateSubcategoriaDto;

    // Si se quiere cambiar la categoría, verificar que existe
    if (categoriaId && categoriaId !== subcategoria.categoriaId) {
      const categoria = await this.prisma.categoria.findUnique({
        where: { id: categoriaId }
      });

      if (!categoria) {
        throw new NotFoundException(`Categoría con ID ${categoriaId} no encontrada`);
      }
    }

    try {
      const updatedSubcategoria = await this.prisma.subcategoria.update({
        where: { id },
        data: {
          ...subcategoriaData,
          ...(categoriaId && { categoriaId })
        },
        include: {
          categoria: {
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
        where: { subcategoriaId: id }
      });

      return new SubcategoriaResponseDto(updatedSubcategoria, totalProductos);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Error al actualizar la subcategoría');
        }
      }
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    const subcategoria = await this.findOne(id); // Verificar que existe

    // Verificar si la subcategoría tiene productos
    const totalProductos = await this.prisma.producto.count({
      where: { subcategoriaId: id }
    });

    if (totalProductos > 0) {
      throw new ConflictException('No se puede eliminar una subcategoría que tiene productos');
    }

    await this.prisma.subcategoria.delete({
      where: { id }
    });
  }

  async getSubcategoriasConProductos(categoriaId?: number): Promise<SubcategoriaResponseDto[]> {
    const where: Prisma.SubcategoriaWhereInput = {
      productos: {
        some: {
          stock: { gt: 0 }
        }
      }
    };
    
    if (categoriaId) {
      where.categoriaId = categoriaId;
    }

    const subcategorias = await this.prisma.subcategoria.findMany({
      where,
      include: {
        categoria: {
          include: {
            tienda: true
          }
        },
        productos: {
          where: { stock: { gt: 0 } },
          take: 5,
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

    const subcategoriasConTotal = await Promise.all(
      subcategorias.map(async (subcategoria) => {
        const totalProductos = await this.prisma.producto.count({
          where: { 
            subcategoriaId: subcategoria.id,
            stock: { gt: 0 }
          }
        });
        return new SubcategoriaResponseDto(subcategoria, totalProductos);
      })
    );

    return subcategoriasConTotal;
  }

  async getEstadisticas(id: number): Promise<any> {
    const subcategoria = await this.findOne(id);

    const [
      totalProductos,
      productosConStock,
      productosSinStock,
      productosDestacados,
      productosOferta
    ] = await Promise.all([
      this.prisma.producto.count({ where: { subcategoriaId: id } }),
      this.prisma.producto.count({ 
        where: { 
          subcategoriaId: id,
          stock: { gt: 0 }
        }
      }),
      this.prisma.producto.count({ 
        where: { 
          subcategoriaId: id,
          stock: { lte: 0 }
        }
      }),
      this.prisma.producto.count({ 
        where: { 
          subcategoriaId: id,
          esDestacado: true
        }
      }),
      this.prisma.producto.count({ 
        where: { 
          subcategoriaId: id,
          enOferta: true
        }
      })
    ]);

    return {
      subcategoria: new SubcategoriaResponseDto(subcategoria, totalProductos),
      estadisticas: {
        totalProductos,
        productosConStock,
        productosSinStock,
        productosDestacados,
        productosOferta,
        porcentajeConStock: totalProductos > 0 ? (productosConStock / totalProductos) * 100 : 0
      }
    };
  }

  async moverProductos(subcategoriaOrigenId: number, subcategoriaDestinoId: number): Promise<any> {
    if (subcategoriaOrigenId === subcategoriaDestinoId) {
      throw new ConflictException('No se puede mover a la misma subcategoría');
    }

    // Verificar que ambas subcategorías existen
    const [subcategoriaOrigen, subcategoriaDestino] = await Promise.all([
      this.prisma.subcategoria.findUnique({ where: { id: subcategoriaOrigenId } }),
      this.prisma.subcategoria.findUnique({ where: { id: subcategoriaDestinoId } })
    ]);

    if (!subcategoriaOrigen) {
      throw new NotFoundException(`Subcategoría origen con ID ${subcategoriaOrigenId} no encontrada`);
    }

    if (!subcategoriaDestino) {
      throw new NotFoundException(`Subcategoría destino con ID ${subcategoriaDestinoId} no encontrada`);
    }

    // Mover todos los productos de una subcategoría a otra
    const result = await this.prisma.producto.updateMany({
      where: { subcategoriaId: subcategoriaOrigenId },
      data: { subcategoriaId: subcategoriaDestinoId }
    });

    return {
      message: `Se movieron ${result.count} productos de la subcategoría ${subcategoriaOrigen.nombre} a ${subcategoriaDestino.nombre}`,
      productosMovidos: result.count
    };
  }
}