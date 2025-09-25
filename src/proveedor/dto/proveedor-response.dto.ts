export class ProveedorTiendaResponseDto {
  id: number;
  proveedorId: number;
  tiendaId: number;

  createdAt: Date;
  updatedAt: Date;
  tienda?: any;

  constructor(proveedorTienda: any) {
    this.id = proveedorTienda.id;
    this.proveedorId = proveedorTienda.proveedorId;
    this.tiendaId = proveedorTienda.tiendaId;
    this.createdAt = proveedorTienda.createdAt;
    this.updatedAt = proveedorTienda.updatedAt;
    this.tienda = proveedorTienda.tienda;
  }
}

export class ProveedorResponseDto {
  id: number;
  nombre: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  ruc?: string;
  activo: boolean;
  pais:string;
  ciudad:string;
  nit:string
  createdAt: Date;
  updatedAt: Date;
  tiendas: ProveedorTiendaResponseDto[];
  totalProductos: number;

  constructor(proveedor: any, totalProductos: number = 0) {
    this.id = proveedor.id;
    this.nombre = proveedor.nombre;
    this.contacto = proveedor.contacto;
    this.telefono = proveedor.telefono;
    this.email = proveedor.email;
    this.direccion = proveedor.direccion;
    this.ruc = proveedor.ruc;
    this.pais=proveedor.pais;
    this.ciudad=proveedor.ciudad;
    this.nit=proveedor.nit

    this.activo = proveedor.activo;
    this.createdAt = proveedor.createdAt;
    this.updatedAt = proveedor.updatedAt;
    this.tiendas = proveedor.tiendas 
      ? proveedor.tiendas.map((pt: any) => new ProveedorTiendaResponseDto(pt))
      : [];
    this.totalProductos = totalProductos;
  }
}