export class LoginValidationResponseDto {
  id: number;
  email: string;
  nombre: string;
  apellido?: string;
  rol: string;
  activo: boolean;
  tiendas: any[];
  sucursales: any[];
  createdAt: Date;

  constructor(partial: Partial<LoginValidationResponseDto>) {
    Object.assign(this, partial);
  }
}