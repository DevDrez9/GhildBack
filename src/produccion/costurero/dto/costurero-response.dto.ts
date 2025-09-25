import { EstadoCosturero } from "generated/prisma/client";

export class CostureroResponseDto {
  id: number;
  nombre: string;
  apellido: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  estado: EstadoCosturero;
  fechaInicio: Date;
  nota?: string;
  usuarioId?: number;
  tiendaId: number;
  usuario?: any;
  tienda?: any;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<any>) {
    this.id = partial.id;
    this.nombre = partial.nombre;
    this.apellido = partial.apellido;
    this.telefono = partial.telefono || undefined; // Convertir null to undefined
    this.email = partial.email || undefined; // Convertir null to undefined
    this.direccion = partial.direccion || undefined; // Convertir null to undefined
    this.estado = partial.estado;
    this.fechaInicio = partial.fechaInicio;
    this.nota = partial.nota || undefined; // Convertir null to undefined
    this.usuarioId = partial.usuarioId || undefined; // Convertir null to undefined
    this.tiendaId = partial.tiendaId;
    this.createdAt = partial.createdAt;
    this.updatedAt = partial.updatedAt;
    
    // Mapear relaciones manualmente
    if (partial.tienda) {
      this.tienda = {
        id: partial.tienda.id,
        nombre: partial.tienda.nombre,
        dominio: partial.tienda.dominio
      };
    }
    
    if (partial.usuario) {
      this.usuario = {
        id: partial.usuario.id,
        nombre: partial.usuario.nombre,
        email: partial.usuario.email,
        rol: partial.usuario.rol
      };
    }
    
    // No mapear trabajos aquí a menos que los necesites en el DTO
    // Los trabajos se manejan en métodos separados
  }
}