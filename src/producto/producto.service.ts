import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

import { CreateProductoDto, CreateImagenProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { ProductoResponseDto, ImagenProductoResponseDto } from './dto/producto-response.dto';
import { FilterProductoDto } from './dto/filter-producto.dto';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from 'generated/prisma/client';



import * as fs from 'fs/promises'; // Usamos fs.promises para operaciones asíncronas
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

import * as crypto from 'crypto'; // Importación correcta del módulo
import sharp from 'sharp';


@Injectable()
export class ProductoService {
  constructor(private readonly prisma: PrismaService) {}

    private async saveBase64Image(base64Data: string): Promise<string> {
        // Usamos 'public/uploads/productos' como la ubicación estándar para archivos estáticos
        const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'productos');
        
        // Asegurarse de que el directorio exista (crea la ruta si no existe)
        await fs.mkdir(UPLOAD_DIR, { recursive: true });

        // 1. Obtener el buffer de datos (ignorando el prefijo "data:...")
        const parts = base64Data.split(';base64,');
        if (parts.length !== 2) {
            // Error más descriptivo para el cliente
            throw new Error("Formato Base64 inválido. Asegúrese de que el encabezado (ej: data:image/jpeg;base64,...) esté incluido.");
        }
        // Usamos parts[1] para el contenido Base64 puro
        const imageBuffer = Buffer.from(parts[1], 'base64');

        // 2. Generar un nombre de archivo único con extensión .webp
        // CORREGIDO: Uso de 'crypto' para resolver el error de tipado
        const uniqueId = crypto.randomBytes(16).toString('hex'); 
        const filename = `${uniqueId}.webp`; // Forzamos la extensión .webp para el archivo guardado
        const filePath = path.join(UPLOAD_DIR, filename);

        try {
            // 3. PROCESAR: Usar sharp para convertir el buffer a WebP y guardar en disco
            // CORREGIDO: Uso del prefijo 'sharp'
            await sharp(imageBuffer)
                .webp({ quality: 85 }) // Convertir a WebP con calidad 85 para optimización
                .toFile(filePath);
            
            // 4. Devolver solo el nombre del archivo para almacenar en la base de datos
            return filename; 

        } catch (error) {
            console.error('Error al procesar la imagen con sharp:', error);
            // Propagar un error amigable
            throw new Error('Error al procesar y guardar la imagen. Verifique los datos de la imagen.');
        }
    }


    async create(createProductoDto: CreateProductoDto): Promise<ProductoResponseDto> {
        // NOTA: La variable 'imagenes' se mantiene, pero se corrige el uso en el bloque 'create'
        const { imagenes, ...productoData } = createProductoDto;

        // --- Bloque de verificaciones (sin cambios) ---
        const tienda = await this.prisma.tienda.findUnique({ where: { id: productoData.tiendaId } });
        if (!tienda) {
            throw new NotFoundException(`Tienda con ID ${productoData.tiendaId} no encontrada`);
        }

        const categoria = await this.prisma.categoria.findUnique({ where: { id: productoData.categoriaId } });
        if (!categoria) {
            throw new NotFoundException(`Categoría con ID ${productoData.categoriaId} no encontrada`);
        }

        if (productoData.subcategoriaId) {
            const subcategoria = await this.prisma.subcategoria.findUnique({ where: { id: productoData.subcategoriaId } });
            if (!subcategoria) {
                throw new NotFoundException(`Subcategoría con ID ${productoData.subcategoriaId} no encontrada`);
            }
        }

        if (productoData.proveedorId) {
            const proveedor = await this.prisma.proveedor.findUnique({ where: { id: productoData.proveedorId } });
            if (!proveedor) {
                throw new NotFoundException(`Proveedor con ID ${productoData.proveedorId} no encontrado`);
            }
        }

        if (productoData.sku) {
            const existingProducto = await this.prisma.producto.findUnique({ where: { sku: productoData.sku } });
            if (existingProducto) {
                throw new ConflictException('El SKU ya está en uso');
            }
        }
        // --- Fin Bloque de verificaciones ---

        let imagenDataForPrisma: { url: string, orden?: number }[] = [];
        
        if (imagenes && imagenes.length > 0) {
            const imagePromises = imagenes.map(async (imageRequest: CreateImagenProductoDto) => {
                
                // 1. GUARDAR Y OBTENER SOLO EL NOMBRE DEL ARCHIVO (EJ: 'abc.webp')
                const filename = await this.saveBase64Image(imageRequest.url);
                
                // 2. Devolver un objeto con el nombre del archivo y el orden
                return {
                    url: filename, // Se guarda el nombre del archivo para la BD
                    orden: imageRequest.orden 
                };
            });

            // Esperar a que todas las URLs se generen
            imagenDataForPrisma = await Promise.all(imagePromises); 
        }

        try {
            // Se utiliza imagenDataForPrisma, que contiene los nombres de archivo cortos
            const producto = await this.prisma.producto.create({
                data: {
                    ...productoData,
                    imagenes: imagenDataForPrisma.length > 0 ? {
                        // ¡BUG CORREGIDO! Se usa imagenDataForPrisma que contiene los nombres de archivo.
                        create: imagenDataForPrisma 
                    } : undefined
                },
                include: {
                    categoria: true,
                    subcategoria: true,
                    tienda: true,
                    proveedor: true,
                    imagenes: true // Incluye las imágenes para la respuesta
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
      enOferta: rawEnOferta, // Use temporary names for raw input
        esNuevo: rawEsNuevo,
        esDestacado: rawEsDestacado,
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

    // ⭐ CRITICAL FIX: Explicitly convert query strings to booleans
    // We only perform the conversion if the parameter was actually provided.
    const enOferta = rawEnOferta !== undefined ? String(rawEnOferta).toLowerCase() === 'true' : undefined;
    const esNuevo = rawEsNuevo !== undefined ? String(rawEsNuevo).toLowerCase() === 'true' : undefined;
    const esDestacado = rawEsDestacado !== undefined ? String(rawEsDestacado).toLowerCase() === 'true' : undefined;
    

    const where: Prisma.ProductoWhereInput = {
      ...(tiendaId && { tiendaId }),
      ...(categoriaId && { categoriaId }),
      ...(subcategoriaId && { subcategoriaId }),
      // ⭐ UPDATED LOGIC: Use the converted boolean values
        // We only add the filter if the value is not 'undefined' after conversion.
        ...(enOferta && { enOferta: true }),
        ...(esNuevo && { esNuevo: true }),
        ...(esDestacado && { esDestacado: true }),
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
    // 1. Verificar que el producto existe
    await this.findOne(id); 

    // 2. Destructurar y establecer valor por defecto para 'imagenes'
    const { imagenes = [], ...productoData } = updateProductoDto;

    // --- Bloque de validaciones (Ajusta según las validaciones que necesites en el update) ---
    
    // Si se actualiza el SKU, verificar que no esté en uso por otro producto
    if (productoData.sku) {
        const existingProducto = await this.prisma.producto.findUnique({ where: { sku: productoData.sku } });
        // Comprobación de que el SKU no esté en uso por otro ID
        if (existingProducto && existingProducto.id !== id) {
            throw new ConflictException('El SKU ya está en uso por otro producto');
        }
    }
    // ... (Otras validaciones de IDs foráneos si son necesarias)
    
    // --- PROCESAMIENTO DE IMÁGENES ---
    let imagenDataForPrisma: { url: string, orden?: number }[] = [];
    
    if (imagenes.length > 0) {
        const imagePromises = imagenes.map(async (imageRequest) => {
            const inputUrl = imageRequest.url; // Contiene Base64 o URL existente
            let finalUrl = inputUrl; // Inicialmente, usamos la URL de entrada
            
            // Comprobación clave: si la URL enviada es una nueva Base64
            if (inputUrl && inputUrl.startsWith('data:')) {
                // Guarda la imagen y obtiene la URL final (o nombre de archivo)
                finalUrl = await this.saveBase64Image(inputUrl);
            }
            
            // Devolver el objeto con la URL final (nueva URL o URL existente) y el orden
            return {
                url: finalUrl,
                orden: imageRequest.orden 
            };
        });

        // Esperar a que todas las URLs se generen
        imagenDataForPrisma = await Promise.all(imagePromises); 
    }
    // ------------------------------------

    try {
        const producto = await this.prisma.producto.update({
            where: { id },
            data: {
                ...productoData,
                // Aplicar el reemplazo de imágenes solo si se envió el campo 'imagenes'
                // Nota: `imagenes` en el DTO es opcional. Usamos `updateProductoDto.imagenes !== undefined` 
                // para saber si el cliente INTENTÓ modificar las imágenes (aunque la lista esté vacía).
                ...(updateProductoDto.imagenes !== undefined && { 
                    imagenes: {
                        deleteMany: {}, // Elimina las imágenes antiguas del producto
                        create: imagenDataForPrisma // Crea las nuevas imágenes (URLs finales)
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
            if (error.code === 'P2002' && productoData.sku) {
                // Comprobar si el error P2002 se debe al SKU
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
  
  async getProductosWeb(tiendaId?: number): Promise<{ 
    nuevos: ProductoResponseDto[]; 
    destacados: ProductoResponseDto[]; 
    oferta: ProductoResponseDto[]; 
}> {
    
    // 1. Ejecutar las tres llamadas de forma paralela
    const [productosNuevos, productosDestacados, productosOferta] = await Promise.all([
        // ¡Importante! Llamar a los métodos (incluyendo 'this' y los argumentos)
        this.getProductosNuevos(tiendaId),
        this.getProductosDestacados(tiendaId),
        this.getProductosOferta(tiendaId),
    ]);

    // 2. Devolver los resultados en la estructura deseada
    return {
        nuevos: productosNuevos,
        destacados: productosDestacados,
        oferta: productosOferta
    };
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