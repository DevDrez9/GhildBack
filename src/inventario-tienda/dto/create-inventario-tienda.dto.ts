import { IsNumber, IsObject, IsOptional } from 'class-validator';

export class CreateInventarioTiendaDto {
  @IsNumber()
  productoId!: number;

  @IsNumber()
  tiendaId!: number;

  // CAMBIO: 'stock' ahora es un objeto opcional.
  @IsObject()
  @IsOptional()
  stock?: Record<string, number>;

  @IsNumber()
  @IsOptional()
  stockMinimo?: number;
}