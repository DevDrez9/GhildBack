export class SubcategoriaResponseDto {
  id: number;
  nombre: string;
  descripcion?: string;
  categoriaId?: number;
  createdAt: Date;
  updatedAt: Date;
  totalProductos: number;

  constructor(subcategoria: any, totalProductos: number = 0) {
    this.id = subcategoria.id;
    this.nombre = subcategoria.nombre;
    this.descripcion = subcategoria.descripcion;
    this.categoriaId = subcategoria.categoriaId;
    this.createdAt = subcategoria.createdAt;
    this.updatedAt = subcategoria.updatedAt;
    this.totalProductos = totalProductos;
  }
}