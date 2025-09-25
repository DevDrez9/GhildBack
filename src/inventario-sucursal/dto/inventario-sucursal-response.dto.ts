export class InventarioSucursalResponseDto {
  id: number;
  productoId: number;
  sucursalId: number;
  tiendaId: number;
  stock: number;
  stockMinimo: number;
  createdAt: Date;
  updatedAt: Date;
  producto?: any;
  sucursal?: any;
  tienda?: any;

  constructor(inventario: any) {
    this.id = inventario.id;
    this.productoId = inventario.productoId;
    this.sucursalId = inventario.sucursalId;
    this.tiendaId = inventario.tiendaId;
    this.stock = inventario.stock;
    this.stockMinimo = inventario.stockMinimo;
    this.createdAt = inventario.createdAt;
    this.updatedAt = inventario.updatedAt;
    this.producto = inventario.producto;
    this.sucursal = inventario.sucursal;
    this.tienda = inventario.tienda;
  }
}