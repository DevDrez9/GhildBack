import { IsNumber } from 'class-validator';

export class UsuarioSucursalDto {
  @IsNumber()
  usuarioId!: number;

  @IsNumber()
  sucursalId!: number;
}