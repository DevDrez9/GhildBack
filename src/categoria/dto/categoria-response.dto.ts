export class SubcategoriaResponseDto {
  id: number;
  nombre: string;
  descripcion?: string;
  categoriaId?: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(subcategoria: any) {
    this.id = subcategoria.id;
    this.nombre = subcategoria.nombre;
    this.descripcion = subcategoria.descripcion;
    this.categoriaId = subcategoria.categoriaId;
    this.createdAt = subcategoria.createdAt;
    this.updatedAt = subcategoria.updatedAt;
  }
}

export class CategoriaResponseDto {
  id: number;
  nombre: string;
  descripcion?: string;
  tiendaId: number;
  createdAt: Date;
  updatedAt: Date;
  subcategorias: SubcategoriaResponseDto[];
  totalProductos: number;

  constructor(categoria: any, totalProductos: number = 0) {
    this.id = categoria.id;
    this.nombre = categoria.nombre;
    this.descripcion = categoria.descripcion;
    this.tiendaId = categoria.tiendaId;
    this.createdAt = categoria.createdAt;
    this.updatedAt = categoria.updatedAt;
    this.subcategorias = categoria.subcategorias 
      ? categoria.subcategorias.map((sub: any) => new SubcategoriaResponseDto(sub))
      : [];
    this.totalProductos = totalProductos;
  }
}