export class InventarioTiendaResponseDto {
  id: number;
  productoId: number;
  tiendaId: number;
  stock: number;
  stockMinimo: number;
  createdAt: Date;
  updatedAt: Date;
  producto?: any;
  tienda?: any;

  constructor(inventario: any) {
    this.id = inventario.id;
    this.productoId = inventario.productoId;
    this.tiendaId = inventario.tiendaId;
    this.stock = inventario.stock;
    this.stockMinimo = inventario.stockMinimo;
    this.createdAt = inventario.createdAt;
    this.updatedAt = inventario.updatedAt;
    this.producto = inventario.producto;
    this.tienda = inventario.tienda;
  }
}