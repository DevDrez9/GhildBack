import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

import { CreateProductoDto, CreateImagenProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { ProductoResponseDto, ImagenProductoResponseDto } from './dto/producto-response.dto';
import { FilterProductoDto } from './dto/filter-producto.dto';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from 'generated/prisma/client';

@Injectable()
export class ProductoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProductoDto: CreateProductoDto): Promise<ProductoResponseDto> {
    const { imagenes, ...productoData } = createProductoDto;

    // Verificar que la tienda existe
    const tienda = await this.prisma.tienda.findUnique({
      where: { id: productoData.tiendaId }
    });

    if (!tienda) {
      throw new NotFoundException(`Tienda con ID ${productoData.tiendaId} no encontrada`);
    }

    // Verificar que la categoría existe
    const categoria = await this.prisma.categoria.findUnique({
      where: { id: productoData.categoriaId }
    });

    if (!categoria) {
      throw new NotFoundException(`Categoría con ID ${productoData.categoriaId} no encontrada`);
    }

    // Verificar que la subcategoría existe si se proporciona
    if (productoData.subcategoriaId) {
      const subcategoria = await this.prisma.subcategoria.findUnique({
        where: { id: productoData.subcategoriaId }
      });

      if (!subcategoria) {
        throw new NotFoundException(`Subcategoría con ID ${productoData.subcategoriaId} no encontrada`);
      }
    }

    // Verificar que el proveedor existe si se proporciona
    if (productoData.proveedorId) {
      const proveedor = await this.prisma.proveedor.findUnique({
        where: { id: productoData.proveedorId }
      });

      if (!proveedor) {
        throw new NotFoundException(`Proveedor con ID ${productoData.proveedorId} no encontrado`);
      }
    }

    // Verificar si el SKU ya existe
    if (productoData.sku) {
      const existingProducto = await this.prisma.producto.findUnique({
        where: { sku: productoData.sku }
      });

      if (existingProducto) {
        throw new ConflictException('El SKU ya está en uso');
      }
    }

    try {
      const producto = await this.prisma.producto.create({
        data: {
          ...productoData,
          imagenes: imagenes ? {
            create: imagenes
          } : undefined
        },
        include: {
          categoria: true,
          subcategoria: true,
          tienda: true,
          proveedor: true,
          imagenes: true
        }
      });

      return new ProductoResponseDto(producto);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('El SKU ya está en uso');
        }
      }
      throw error;
    }
  }

async findAll(filterProductoDto: FilterProductoDto = {}): Promise<{ productos: ProductoResponseDto[], total: number }> {
    const {
      tiendaId,
      categoriaId,
      subcategoriaId,
      enOferta,
      esNuevo,
      esDestacado,
      search,
      minPrice,
      maxPrice,
      ids,
      orderBy = 'nombre',
      orderDirection = 'asc',
      page = 1,
      limit = 10
    } = filterProductoDto;

    // Validar y asegurar que page y limit sean números válidos
    const pageNumber = Math.max(1, parseInt(page as any) || 1);
    const limitNumber = Math.max(1, Math.min(parseInt(limit as any) || 10, 100)); // Limitar máximo a 100

    const where: Prisma.ProductoWhereInput = {
      ...(tiendaId && { tiendaId }),
      ...(categoriaId && { categoriaId }),
      ...(subcategoriaId && { subcategoriaId }),
      ...(enOferta !== undefined && { enOferta }),
      ...(esNuevo !== undefined && { esNuevo }),
      ...(esDestacado !== undefined && { esDestacado }),
      ...(search && {
        OR: [
          { nombre: { contains: search } },
          { descripcion: { contains: search } },
          { sku: { contains: search } }
        ]
      }),
      ...((minPrice !== undefined || maxPrice !== undefined) && {
        precio: {
          ...(minPrice !== undefined && { gte: Number(minPrice) }),
          ...(maxPrice !== undefined && { lte: Number(maxPrice) })
        }
      }),
      ...(ids && { id: { in: ids } })
    };

    const orderByField: Prisma.ProductoOrderByWithRelationInput = {};
    if (orderBy === 'precio') orderByField.precio = orderDirection;
    else if (orderBy === 'createdAt') orderByField.createdAt = orderDirection;
    else if (orderBy === 'stock') orderByField.stock = orderDirection;
    else orderByField.nombre = orderDirection;

    const [productos, total] = await Promise.all([
      this.prisma.producto.findMany({
        where,
        include: {
          categoria: true,
          subcategoria: true,
          tienda: true,
          proveedor: true,
          imagenes: {
            orderBy: { orden: 'asc' }
          }
        },
        orderBy: orderByField,
        skip: (pageNumber - 1) * limitNumber,
        take: limitNumber // Usar el número validado
      }),
      this.prisma.producto.count({ where })
    ]);

    return {
      productos: productos.map(producto => new ProductoResponseDto(producto)),
      total
    };
  }

  async findOne(id: number): Promise<any> {
    const producto = await this.prisma.producto.findUnique({
      where: { id },
      include: {
        categoria: {
          include: {
            tienda: true
          }
        },
        subcategoria: true,
        tienda: true,
        proveedor: true,
        imagenes: {
          orderBy: { orden: 'asc' }
        },
        inventarioTienda: true,
        inventarioSucursales: {
          include: {
            sucursal: true
          }
        }
      }
    });

    if (!producto) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }

    return producto;
  }

  async findBySku(sku: string): Promise<ProductoResponseDto> {
    const producto = await this.prisma.producto.findUnique({
      where: { sku },
      include: {
        categoria: true,
        subcategoria: true,
        tienda: true,
        proveedor: true,
        imagenes: {
          orderBy: { orden: 'asc' }
        }
      }
    });

    if (!producto) {
      throw new NotFoundException(`Producto con SKU ${sku} no encontrado`);
    }

    return new ProductoResponseDto(producto);
  }

  async update(id: number, updateProductoDto: UpdateProductoDto): Promise<ProductoResponseDto> {
    await this.findOne(id); // Verificar que existe

    const { imagenes, ...productoData } = updateProductoDto;

    try {
      const producto = await this.prisma.producto.update({
        where: { id },
        data: {
          ...productoData,
          ...(imagenes && {
            imagenes: {
              deleteMany: {}, // Eliminar imágenes existentes
              create: imagenes // Crear nuevas imágenes
            }
          })
        },
        include: {
          categoria: true,
          subcategoria: true,
          tienda: true,
          proveedor: true,
          imagenes: true
        }
      });

      return new ProductoResponseDto(producto);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('El SKU ya está en uso');
        }
      }
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id); // Verificar que existe

    // En lugar de eliminar, podrías marcar como inactivo
    // o implementar soft delete según tu schema
    await this.prisma.producto.delete({
      where: { id }
    });
  }

  async updateStock(id: number, cantidad: number, tipo: 'incremento' | 'decremento'): Promise<ProductoResponseDto> {
    const producto = await this.findOne(id);

    if (tipo === 'decremento' && producto.stock < cantidad) {
      throw new BadRequestException('Stock insuficiente');
    }

    const updatedProducto = await this.prisma.producto.update({
      where: { id },
      data: {
        stock: tipo === 'incremento' 
          ? { increment: cantidad }
          : { decrement: cantidad }
      },
      include: {
        categoria: true,
        subcategoria: true,
        tienda: true,
        proveedor: true,
        imagenes: true
      }
    });

    return new ProductoResponseDto(updatedProducto);
  }

   async getProductosDestacados(tiendaId?: number): Promise<ProductoResponseDto[]> {
    const where: Prisma.ProductoWhereInput = {
      esDestacado: true,
      stock: { gt: 0 },
      ...(tiendaId && { tiendaId })
    };

    const productos = await this.prisma.producto.findMany({
      where,
      include: {
        categoria: true,
        subcategoria: true,
        tienda: true,
        proveedor: true,
        imagenes: {
          orderBy: { orden: 'asc' }
        }
      },
      take: 12,
      orderBy: { createdAt: 'desc' }
    });

    return productos.map(producto => new ProductoResponseDto(producto));
  }

  async getProductosOferta(tiendaId?: number): Promise<ProductoResponseDto[]> {
    const where: Prisma.ProductoWhereInput = {
      enOferta: true,
      stock: { gt: 0 },
      ...(tiendaId && { tiendaId })
    };

    const productos = await this.prisma.producto.findMany({
      where,
      include: {
        categoria: true,
        subcategoria: true,
        tienda: true,
        proveedor: true,
        imagenes: {
          orderBy: { orden: 'asc' }
        }
      },
      take: 12,
      orderBy: { createdAt: 'desc' }
    });

    return productos.map(producto => new ProductoResponseDto(producto));
  }

  async getProductosNuevos(tiendaId?: number): Promise<ProductoResponseDto[]> {
    const where: Prisma.ProductoWhereInput = {
      esNuevo: true,
      stock: { gt: 0 },
      ...(tiendaId && { tiendaId })
    };

    const productos = await this.prisma.producto.findMany({
      where,
      include: {
        categoria: true,
        subcategoria: true,
        tienda: true,
        proveedor: true,
        imagenes: {
          orderBy: { orden: 'asc' }
        }
      },
      take: 12,
      orderBy: { createdAt: 'desc' }
    });

    return productos.map(producto => new ProductoResponseDto(producto));
  }
   async getProductosBajoStock(tiendaId?: number, stockMinimo: number = 5): Promise<{ productos: ProductoResponseDto[], total: number }> {
    const where: Prisma.ProductoWhereInput = {
      stock: { lte: stockMinimo },
      ...(tiendaId && { tiendaId })
    };

    const [productos, total] = await Promise.all([
      this.prisma.producto.findMany({
        where,
        include: {
          categoria: true,
          subcategoria: true,
          tienda: true,
          proveedor: true,
          imagenes: true
        },
        orderBy: { stock: 'asc' }
      }),
      this.prisma.producto.count({ where })
    ]);

    return {
      productos: productos.map(producto => new ProductoResponseDto(producto)),
      total
    };
  }
  async addImagenes(productoId: number, imagenes: CreateImagenProductoDto[]): Promise<ImagenProductoResponseDto[]> {
    await this.findOne(productoId); // Verificar que el producto existe

     const createdImagenes = await this.prisma.$transaction(async (prisma) => {
    // Crear las imágenes
    await prisma.imagenProducto.createMany({
      data: imagenes.map(imagen => ({
        ...imagen,
        productoId
      }))
    });

    // Obtener las imágenes creadas
    return prisma.imagenProducto.findMany({
      where: { productoId },
      orderBy: { id: 'desc' },
      take: imagenes.length
    });
  });

  return createdImagenes.map(imagen => new ImagenProductoResponseDto(imagen));
}

  async removeImagen(imagenId: number): Promise<void> {
    const imagen = await this.prisma.imagenProducto.findUnique({
      where: { id: imagenId }
    });

    if (!imagen) {
      throw new NotFoundException(`Imagen con ID ${imagenId} no encontrada`);
    }

    await this.prisma.imagenProducto.delete({
      where: { id: imagenId }
    });
  }
}