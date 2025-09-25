export class TiendaResponseDto {
  id: number;
  nombre: string;
  descripcion?: string;
  dominio: string;
  activa: boolean;
  esPrincipal: boolean;
  configWebId: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(tienda: any) {
    this.id = tienda.id;
    this.nombre = tienda.nombre;
    this.descripcion = tienda.descripcion;
    this.dominio = tienda.dominio;
    this.activa = tienda.activa;
    this.esPrincipal = tienda.esPrincipal;
    this.configWebId = tienda.configWebId;
    this.createdAt = tienda.createdAt;
    this.updatedAt = tienda.updatedAt;
  }
}