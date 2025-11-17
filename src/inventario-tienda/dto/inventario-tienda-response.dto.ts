export class InventarioTiendaResponseDto {
  id: number;
  productoId: number;
  tiendaId: number;
  stock: Record<string, number>; // Objeto con stock por talla
  stockTotal: number; // Campo calculado
  stockMinimo: number;
  createdAt: Date;
  updatedAt: Date;
  producto?: any;
  tienda?: any;

  constructor(inventario: any) {
    this.id = inventario.id;
    this.productoId = inventario.productoId;
    this.tiendaId = inventario.tiendaId;
    
    // Asegura que 'stock' sea un objeto válido
    this.stock = (typeof inventario.stock === 'object' && inventario.stock !== null && !Array.isArray(inventario.stock)) 
      ? inventario.stock 
      : {};

    // Calcula el stock total sumando las cantidades de las tallas
    this.stockTotal = Object.values<number>(this.stock).reduce((sum, current) => sum + current, 0);

    this.stockMinimo = inventario.stockMinimo;
    this.createdAt = inventario.createdAt;
    this.updatedAt = inventario.updatedAt;
    this.producto = inventario.producto;
    this.tienda = inventario.tienda;
  }
}