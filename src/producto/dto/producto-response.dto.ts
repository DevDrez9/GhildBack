export class ImagenProductoResponseDto {
  id: number;
  url: string;
  orden: number;
  productoId: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(imagen: any) {
    this.id = imagen.id;
    this.url = imagen.url;
    this.orden = imagen.orden;
    this.productoId = imagen.productoId;
    this.createdAt = imagen.createdAt;
    this.updatedAt = imagen.updatedAt;
  }
}

export class ProductoResponseDto {
  id: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  precioOferta?: number;
  enOferta: boolean;
  esNuevo: boolean;
  esDestacado: boolean;
  stock: number;
  stockMinimo: number;
  sku?: string;
  imagenUrl?: string;
  categoriaId: number;
  subcategoriaId?: number;
  tiendaId: number;
  proveedorId?: number;
  createdAt: Date;
  updatedAt: Date;
  imagenes: ImagenProductoResponseDto[];

  constructor(producto: any) {
    this.id = producto.id;
    this.nombre = producto.nombre;
    this.descripcion = producto.descripcion;
    this.precio = producto.precio;
    this.precioOferta = producto.precioOferta;
    this.enOferta = producto.enOferta;
    this.esNuevo = producto.esNuevo;
    this.esDestacado = producto.esDestacado;
    this.stock = producto.stock;
    this.stockMinimo = producto.stockMinimo;
    this.sku = producto.sku;
    this.imagenUrl = producto.imagenUrl;
    this.categoriaId = producto.categoriaId;
    this.subcategoriaId = producto.subcategoriaId;
    this.tiendaId = producto.tiendaId;
    this.proveedorId = producto.proveedorId;
    this.createdAt = producto.createdAt;
    this.updatedAt = producto.updatedAt;
    this.imagenes = producto.imagenes ? producto.imagenes.map((img: any) => new ImagenProductoResponseDto(img)) : [];
  }
}