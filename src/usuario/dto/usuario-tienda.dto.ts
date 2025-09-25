import { IsNumber } from 'class-validator';

export class UsuarioTiendaDto {
  @IsNumber()
  usuarioId!: number;

  @IsNumber()
  tiendaId!: number;
}