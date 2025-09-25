import { IsNumber, IsOptional } from 'class-validator';

export class CreateInventarioSucursalDto {
  @IsNumber()
  productoId!: number;

  @IsNumber()
  sucursalId!: number;

  @IsNumber()
  tiendaId!: number;

  @IsNumber()
  @IsOptional()
  stock?: number;

  @IsNumber()
  @IsOptional()
  stockMinimo?: number;
}