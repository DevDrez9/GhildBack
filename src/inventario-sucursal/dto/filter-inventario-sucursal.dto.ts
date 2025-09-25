import { IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class FilterInventarioSucursalDto {
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  productoId?: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  sucursalId?: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  tiendaId?: number;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  bajoStock?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  sinStock?: boolean;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page?: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number;
}