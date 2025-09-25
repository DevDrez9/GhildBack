import { IsNumber, IsBoolean, IsOptional, IsString, IsArray } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class FilterProductoDto {
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  tiendaId?: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  categoriaId?: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  subcategoriaId?: number;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  enOferta?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  esNuevo?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  esDestacado?: boolean;

  @IsString()
  @IsOptional()
  search?: string;

 @IsNumber()
  @IsOptional()
  @Type(() => Number)
  minPrice?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  maxPrice?: number;

  @IsArray()
@IsOptional()
@Transform(({ value }) => {
  if (!value) return undefined;
  return value.split(',').map((id: string) => parseInt(id));
})
ids?: number[];

  @IsString()
  @IsOptional()
  orderBy?: 'nombre' | 'precio' | 'createdAt' | 'stock';

  @IsString()
  @IsOptional()
  orderDirection?: 'asc' | 'desc';

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page?: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number;
}