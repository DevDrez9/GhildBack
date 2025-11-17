import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { CreateCarritoDto, CreateCarritoItemDto } from './dto/create-carrito.dto';
import { CarritoResponseDto } from './dto/carrito-response.dto';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from 'generated/prisma';
import { CarritoEstado } from './dto/filter-carrito.dto';


@Injectable()
export class CarritoService {
    constructor(private prisma: PrismaService) {}

    // ----------------------------------------------------------------
    // Lógica principal: CREAR o ENCONTRAR un carrito 'nuevo'
    // ----------------------------------------------------------------
    async createOrFind(createCarritoDto: CreateCarritoDto): Promise<CarritoResponseDto> {
    const clienteId = createCarritoDto.clienteId;
    
    // 1. Buscar carrito existente con estado 'nuevo'
    let carrito = await this.prisma.carrito.findFirst({
        where: { 
            clienteId: clienteId,
            tiendaId: createCarritoDto.tiendaId,
            estado: 'nuevo' 
        },
        include: { items: true } 
    });

    // 2. Si el carrito EXISTE, AGREGAR o ACTUALIZAR los ítems
    if (carrito) {
        if (createCarritoDto.items && createCarritoDto.items.length > 0) {
            
            // Obtener precios de productos
            const productoIds = createCarritoDto.items.map(item => item.productoId);
            const productos = await this.prisma.producto.findMany({
                where: { id: { in: productoIds } },
                select: { id: true, precio: true } 
            });

            await this.prisma.$transaction(async (tx) => {
                for (const newItem of createCarritoDto.items!) { 
                    const productoMaestro = productos.find(p => p.id === newItem.productoId);

                    if (!productoMaestro) {
                        throw new BadRequestException(`Producto con ID ${newItem.productoId} no encontrado.`);
                    }

                    // 🚨 CORRECCIÓN AQUÍ: Buscar coincidencia por Producto ID **Y** Talla
                    const existingItem = carrito!.items.find(
                        item => item.productoId === newItem.productoId && item.talla === newItem.talla
                    );

                    if (existingItem) {
                        // Si ya existe el mismo producto con la misma talla -> Sumar cantidad
                        await tx.carritoItem.update({
                            where: { id: existingItem.id },
                            data: {
                                cantidad: { increment: newItem.cantidad },
                            },
                        });
                    } else {
                        // Si es nueva talla o nuevo producto -> Crear ítem
                        await tx.carritoItem.create({
                            data: {
                                carritoId: carrito!.id,
                                productoId: newItem.productoId,
                                cantidad: newItem.cantidad,
                                // 🚨 Asegurarse de guardar la talla
                                talla: newItem.talla, 
                                precio: productoMaestro.precio, 
                            },
                        });
                    }
                }
                
                // Recalcular total (lógica existente)
                const itemsActualizados = await tx.carritoItem.findMany({ where: { carritoId: carrito?.id } });
                const totalRecalculado = itemsActualizados.reduce((sum, item) => {
                    const itemPrice = item.precio?.toNumber() ?? 0; 
                    return sum + (itemPrice * item.cantidad);
                }, 0);
                
                await tx.carrito.update({
                    where: { id: carrito?.id },
                    data: { precio: new Prisma.Decimal(totalRecalculado) },
                });
            });
            
            // Recargar carrito
            carrito = await this.prisma.carrito.findUnique({
                where: { id: carrito.id },
                include: { items: true }
            });
        }
        
    } 
    // 3. Si NO EXISTE, crear carrito nuevo
    else {
        const productoIds = createCarritoDto.items?.map(item => item.productoId) || [];
        const productos = await this.prisma.producto.findMany({
            where: { id: { in: productoIds } },
            select: { id: true, precio: true } 
        });
        
        let totalCarritoInicial: number = 0;

        const itemData = createCarritoDto.items?.map(item => {
            const producto = productos.find(p => p.id === item.productoId);
            if (!producto) throw new BadRequestException(`Producto no encontrado.`);
            
            const cantidad = item.cantidad!;
            totalCarritoInicial += producto.precio.toNumber() * cantidad;

            return {
                productoId: item.productoId,
                cantidad: item.cantidad,
                // 🚨 Asegurarse de guardar la talla aquí también
                talla: item.talla, 
                precio: producto.precio, 
            };
        }) || [];

        carrito = await this.prisma.carrito.create({
            data: {
                clienteId: Number(clienteId),
                tiendaId: createCarritoDto.tiendaId,
                estado: 'nuevo', 
                cliente: createCarritoDto.cliente,
                telefono: createCarritoDto.telefono,
                direccion: createCarritoDto.direccion,
                notas: createCarritoDto.notas,
                precio: new Prisma.Decimal(totalCarritoInicial),
                items: {
                    create: itemData, // Prisma creará los items con el campo 'talla'
                }
            },
            include: { items: true }
        });
    }

    return new CarritoResponseDto(carrito);
  }

    // ----------------------------------------------------------------
    // Lógica de Ítems: Agregar producto al carrito
    // ----------------------------------------------------------------
    async addItem(carritoId: number, itemDto: CreateCarritoItemDto): Promise<CarritoResponseDto> {
        const { productoId, cantidad = 1, talla } = itemDto;

        // 1. Verificar si el carrito existe y si está 'nuevo'
        const carrito = await this.prisma.carrito.findUnique({ 
            where: { id: carritoId }, 
            include: { items: true } 
        });

        if (!carrito || carrito.estado !== 'nuevo') {
            throw new BadRequestException('Carrito no encontrado o no está en estado "nuevo".');
        }

        // 2. Verificar si el ítem ya existe en el carrito
        const existingItem = carrito.items.find(item => item.productoId === productoId);
        
        // 3. Obtener el precio del producto (IMPORTANTE para calcular el total)
        const producto = await this.prisma.producto.findUnique({ where: { id: productoId }, select: { precio: true, stock: true } });
        
        if (!producto || producto.stock < cantidad) {
            throw new BadRequestException('Producto no encontrado o stock insuficiente.');
        }

        let updatedCarrito;
        await this.prisma.$transaction(async (tx) => {
            if (existingItem) {
                // Actualizar cantidad
                await tx.carritoItem.update({
                    where: { id: existingItem.id },
                    data: { cantidad: { increment: cantidad } }
                });
            } else {
                // Crear nuevo ítem
                await tx.carritoItem.create({
                    data: {
                        carritoId,
                        productoId,
                        cantidad,
                        talla,
                        precio: producto.precio // Asignar el precio actual del producto
                    }
                });
            }
            
            // Actualizar precio total del carrito (simplificado)
            const items = await tx.carritoItem.findMany({ where: { carritoId } });
           // Error aquí: item.precio podría ser null
   // ⭐ SOLUCIÓN: Usar la verificación de null o proporcionar un valor de 0 si es null.
            const total = items.reduce((sum, item) => {
                // Si item.precio es null, asumimos 0 para el cálculo.
                const itemPrice = item.precio?.toNumber() ?? 0;
                return sum + (itemPrice * item.cantidad);
            }, 0);
            
            updatedCarrito = await tx.carrito.update({
                where: { id: carritoId },
                data: { precio: new Prisma.Decimal(total) },
                include: { items: true }
            });
        });

        return new CarritoResponseDto(updatedCarrito);
    }

    // ----------------------------------------------------------------
    // Lógica de Finalización
    // ----------------------------------------------------------------
    async checkout(carritoId: number): Promise<CarritoResponseDto> {
        const carrito = await this.prisma.carrito.findUnique({ where: { id: carritoId } });

        if (!carrito) {
            throw new NotFoundException(`Carrito con ID ${carritoId} no encontrado.`);
        }
        if (carrito.estado !== 'nuevo') {
            throw new BadRequestException('Solo se puede finalizar la compra de un carrito "nuevo".');
        }

        // Finalizar la compra: cambiar el estado a "pendiente"
        const updatedCarrito = await this.prisma.carrito.update({
            where: { id: carritoId },
            data: { estado: 'pendiente', notas:"no pagado" },
            include: { items: true }
        });

        return new CarritoResponseDto(updatedCarrito);
    }
     async checkoutPagado(carritoId: number): Promise<CarritoResponseDto> {
        const carrito = await this.prisma.carrito.findUnique({ where: { id: carritoId } });

        if (!carrito) {
            throw new NotFoundException(`Carrito con ID ${carritoId} no encontrado.`);
        }
        if (carrito.estado !== 'nuevo') {
            throw new BadRequestException('Solo se puede finalizar la compra de un carrito "nuevo".');
        }

        // Finalizar la compra: cambiar el estado a "pendiente"
        const updatedCarrito = await this.prisma.carrito.update({
            where: { id: carritoId },
            data: { estado: 'pendiente', notas: "pagado" },
            include: { items: true }
        });

        return new CarritoResponseDto(updatedCarrito);
    }
    async cancelar(carritoId: number): Promise<CarritoResponseDto> {
        const carrito = await this.prisma.carrito.findUnique({ where: { id: carritoId } });

        if (!carrito) {
            throw new NotFoundException(`Carrito con ID ${carritoId} no encontrado.`);
        }
        if (carrito.estado !== 'pendiente') {
            throw new BadRequestException('Solo se puede finalizar la compra de un carrito "nuevo".');
        }

        // Finalizar la compra: cambiar el estado a "pendiente"
        const updatedCarrito = await this.prisma.carrito.update({
            where: { id: carritoId },
            data: { estado: 'cancelado' },
            include: { items: true }
        });

        return new CarritoResponseDto(updatedCarrito);
    }

    // ----------------------------------------------------------------
    // Lógica de Terminación (Ejecutada después de procesar el pago/orden)
    // ----------------------------------------------------------------
    async complete(carritoId: number): Promise<CarritoResponseDto> {
        const carrito = await this.prisma.carrito.findUnique({ where: { id: carritoId } });

        if (!carrito) {
            throw new NotFoundException(`Carrito con ID ${carritoId} no encontrado.`);
        }
        if (carrito.estado !== 'pendiente') {
            throw new BadRequestException('Solo se puede terminar un carrito "pendiente".');
        }

        // Cambiar estado a "terminado"
        const updatedCarrito = await this.prisma.carrito.update({
            where: { id: carritoId },
            data: { estado: 'terminado', notas:"pagado" },
            include: { items: true }
        });

        return new CarritoResponseDto(updatedCarrito);
    }

    // Método para obtener el carrito (útil para ver el estado actual)
    async findOne(id: number): Promise<CarritoResponseDto> {
        const carrito = await this.prisma.carrito.findUnique({
            where: { id },
            include: { items: true }
        });
        if (!carrito) {
            throw new NotFoundException(`Carrito con ID ${id} no encontrado.`);
        }
        return new CarritoResponseDto(carrito);
    }
     async findByClienteId(clienteId: number): Promise<CarritoResponseDto[]> {
        if (!clienteId) {
            throw new BadRequestException('El clienteId es requerido para esta búsqueda.');
        }

        const carritos = await this.prisma.carrito.findMany({
            where: { clienteId },
            include: { 
                items: {
                    include: { producto: {
                        include: {
                        imagenes: {
                            select: { url: true, orden: true },
                            orderBy: { orden: 'asc' },
                        }
                    }
                    } } // Incluir producto en los ítems
                }
            },
            orderBy: { updatedAt: 'desc' } // Ordenar por el más reciente
        });

        if (carritos.length === 0) {
            // Opcional: Podrías devolver un array vacío o lanzar un NotFoundException
            // Devolver un array vacío es más común para búsquedas de listas.
            return [];
        }

        return carritos.map(carrito => new CarritoResponseDto(carrito));
    }
     async findCarritosByTiendaAndState(
        tiendaId: number, 
        estadoFiltro: CarritoEstado = CarritoEstado.TODOS
    ): Promise<CarritoResponseDto[]> {
        
        if (!tiendaId) {
            throw new BadRequestException('El tiendaId es requerido para esta búsqueda administrativa.');
        }

        const baseWhere: Prisma.CarritoWhereInput = {
            tiendaId: tiendaId,
        };

        let estadoFilter: Prisma.CarritoWhereInput = {};

        // Lógica de Filtrado por Estado
        if (estadoFiltro === CarritoEstado.PENDIENTE) {
            estadoFilter = { estado: 'pendiente' };
        } else if (estadoFiltro === CarritoEstado.TERMINADO) {
            estadoFilter = { estado: 'terminado' };
        } else if (estadoFiltro === CarritoEstado.CANCELDO) {
            estadoFilter = { estado: 'cancelado' };
        } else if (estadoFiltro === CarritoEstado.TODOS) {
            // ⭐ CAMBIO CLAVE: Usamos 'OR' para incluir solo 'pendiente' y 'terminado'
            estadoFilter = {
                OR: [
                    { estado: 'pendiente' },
                    { estado: 'terminado' },
                    { estado: 'cancelado' },
                ]
            };
        } else {
            // Maneja otros estados si se pasan explícitamente (ej. 'nuevo')
            estadoFilter = { estado: estadoFiltro };
        }

        const where: Prisma.CarritoWhereInput = {
            ...baseWhere,
            ...estadoFilter,
        };

        const carritos = await this.prisma.carrito.findMany({
            where,
            // ... (includes, orderBy, etc.)
            include: { 
                usuario: true,
                items: {
                    include: { producto: true }
                },
                
                
            },
            orderBy: { createdAt: 'desc' }
        });

        return carritos.map(carrito => new CarritoResponseDto(carrito));
    }

   
   async deleteCarrito(carritoId: number): Promise<void> {
        
        // Usamos una transacción para garantizar que ambos borrados ocurran o ninguno.
        await this.prisma.$transaction(async (tx) => {
            
            // 1. Borrar todos los items asociados al carrito
            await tx.carritoItem.deleteMany({
                where: { carritoId: carritoId },
            });

            // 2. Borrar el carrito padre
            await tx.carrito.delete({
                where: { id: carritoId },
            });
        });
        
        // Nota: Si tienes configurado onDelete: Cascade en tu schema,
        // solo el paso 2 sería necesario. Mantenemos ambos para seguridad.
    }
    async deleteItemFromCarrito(itemId: number): Promise<void> {
        
        // Simplemente borramos el ítem. Prisma se encargará de actualizar las relaciones.
        // No necesitamos una transacción aquí, ya que solo es una operación de borrado.
        await this.prisma.carritoItem.delete({
            where: { id: itemId },
        });
    }
}