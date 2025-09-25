export class CarritoItemResponseDto {
  id: number;
  cantidad: number;
  productoId: number;
  carritoId: number;
  createdAt: Date;
  updatedAt: Date;
  producto?: any;

  constructor(item: any) {
    this.id = item.id;
    this.cantidad = item.cantidad;
    this.productoId = item.productoId;
    this.carritoId = item.carritoId;
    this.createdAt = item.createdAt;
    this.updatedAt = item.updatedAt;
    this.producto = item.producto;
  }
}

export class CarritoResponseDto {
  id: number;
  cliente: string;
  telefono?: string;
  direccion?: string;
  notas?: string;
  estado: string;
  tiendaId: number;
  createdAt: Date;
  updatedAt: Date;
  items: CarritoItemResponseDto[];
  tienda?: any;
  total: number;

  constructor(carrito: any) {
    this.id = carrito.id;
    this.cliente = carrito.cliente;
    this.telefono = carrito.telefono;
    this.direccion = carrito.direccion;
    this.notas = carrito.notas;
    this.estado = carrito.estado;
    this.tiendaId = carrito.tiendaId;
    this.createdAt = carrito.createdAt;
    this.updatedAt = carrito.updatedAt;
    this.items = carrito.items ? carrito.items.map((item: any) => new CarritoItemResponseDto(item)) : [];
    this.tienda = carrito.tienda;
    
    // Calcular total
    this.total = carrito.items ? carrito.items.reduce((total: number, item: any) => {
      const precio = item.producto?.precioOferta || item.producto?.precio || 0;
      return total + (precio * item.cantidad);
    }, 0) : 0;
  }
}