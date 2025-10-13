// Asumo que esta es la forma de mapear los objetos de Prisma a tus DTOs
export class CarritoItemResponseDto {
    id: number;
    cantidad: number;
    productoId: number;
    precio: number;
    
    producto: {
        id: number;
        nombre: string;
        precio: number; 
        // ⭐ CAMBIO CLAVE: Campo para la primera imagen ⭐
        imagenPrincipalUrl: string | null; 
    } | null;

    constructor(item: any) {
        this.id = item.id;
        this.cantidad = item.cantidad;
        this.productoId = item.productoId;
        this.precio = parseFloat(item.precio || 0); 

        if (item.producto) {
            
            // ⭐ LÓGICA PARA OBTENER LA PRIMERA IMAGEN ⭐
            const imagenPrincipal = item.producto.imagenes
                // Opcional: ordenar por 'orden' para asegurar que sea la #1
                ?.sort((a, b) => a.orden - b.orden) 
                ?.[0]; // Tomar el primer elemento después de ordenar

            this.producto = {
                id: item.producto.id,
                nombre: item.producto.nombre,
                precio: parseFloat(item.producto.precio || 0),
                // Asignar la URL si se encontró la imagen principal
                imagenPrincipalUrl: imagenPrincipal?.url || null, 
            };
        } else {
            this.producto = null; 
        }
    }
}
export class CarritoResponseDto {
    id: number;
    clienteId: number;
    tiendaId: number;
    estado: string;
    cliente?: string;
    telefono?: string;
    direccion?: string;
    notas?: string;
    precio: number;
    createdAt: Date;
    items: CarritoItemResponseDto[];

    constructor(carrito: any) {
        this.id = carrito.id;
        this.clienteId = carrito.clienteId;
        this.tiendaId = carrito.tiendaId;
        this.estado = carrito.estado;
        this.cliente = carrito.cliente;
        this.telefono = carrito.telefono;
        this.direccion = carrito.direccion;
        this.notas = carrito.notas;
        this.precio = carrito.precio || 0;
        this.createdAt = carrito.createdAt;
        this.items = carrito.items?.map(item => new CarritoItemResponseDto(item)) || [];
    }
}