export class InventarioSucursalResponseDto {
  id: number;
  productoId: number;
  sucursalId: number;
  tiendaId: number;

  /** ✅ MODIFICADO: El stock es un objeto detallado por talla. */
  stock: Record<string, number>;

  /** ✨ NUEVO: Campo calculado para el total de unidades. */
  stockTotal: number;

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

    // Lógica para manejar el objeto de stock
    this.stock = (typeof inventario.stock === 'object' && inventario.stock !== null && !Array.isArray(inventario.stock))
      ? inventario.stock
      : {};

    // Lógica para calcular el total
    this.stockTotal = Object.values<number>(this.stock).reduce((sum, current) => sum + (current || 0), 0);

    this.stockMinimo = inventario.stockMinimo;
    this.createdAt = inventario.createdAt;
    this.updatedAt = inventario.updatedAt;
    this.producto = inventario.producto;
    this.sucursal = inventario.sucursal;
    this.tienda = inventario.tienda;
  }
}