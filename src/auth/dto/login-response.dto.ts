export class LoginResponseDto {
  accessToken: string;
  usuario: {
    id: number;
    email: string;
    nombre: string;
    apellido?: string;
    rol: string;
    tiendas: any[];
    sucursales: any[];
  };

  constructor(accessToken: string, usuario: any) {
    this.accessToken = accessToken;
    this.usuario = {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      rol: usuario.rol,
      tiendas: usuario.tiendas,
      sucursales: usuario.sucursales
    };
  }
}