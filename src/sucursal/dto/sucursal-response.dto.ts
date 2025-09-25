export class SucursalResponseDto {
  id: number;
  nombre: string;
  direccion: string;
  telefono?: string;
  email?: string;
  responsable?: string;
  activa: boolean;
  tiendaId: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(sucursal: any) {
    this.id = sucursal.id;
    this.nombre = sucursal.nombre;
    this.direccion = sucursal.direccion;
    this.telefono = sucursal.telefono;
    this.email = sucursal.email;
    this.responsable = sucursal.responsable;
    this.activa = sucursal.activa;
    this.tiendaId = sucursal.tiendaId;
    this.createdAt = sucursal.createdAt;
    this.updatedAt = sucursal.updatedAt;
  }
}