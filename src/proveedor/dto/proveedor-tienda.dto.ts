import { IsNumber } from 'class-validator';

export class ProveedorTiendaDto {
  @IsNumber()
  proveedorId!: number;

  @IsNumber()
  tiendaId!: number;
}