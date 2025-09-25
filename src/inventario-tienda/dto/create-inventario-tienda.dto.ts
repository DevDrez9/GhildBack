import { IsNumber, IsOptional } from 'class-validator';

export class CreateInventarioTiendaDto {
  @IsNumber()
  productoId!: number;

  @IsNumber()
  tiendaId!: number;

  @IsNumber()
  @IsOptional()
  stock?: number;

  @IsNumber()
  @IsOptional()
  stockMinimo?: number;
}