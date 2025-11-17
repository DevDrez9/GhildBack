import { IsString, IsNumber, IsBoolean, IsOptional, IsDecimal, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateImagenProductoDto {
  @IsString()
  url!: string; 

  @IsNumber()
  @IsOptional()
  orden?: number;
}

export class CreateProductoDto {
  @IsString()
  nombre!: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsNumber()
  precio!: number;

  @IsNumber()
  @IsOptional()
  precioOferta?: number;

  @IsBoolean()
  @IsOptional()
  enOferta?: boolean;

  @IsBoolean()
  @IsOptional()
  esNuevo?: boolean;

  @IsBoolean()
  @IsOptional()
  esDestacado?: boolean;

  @IsNumber()
  @IsOptional()
  stock?: number;

  @IsNumber()
  @IsOptional()
  stockMinimo?: number;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  tallas?: string;

  @IsString()
  @IsOptional()
  imagenUrl?: string;

  @IsNumber()
  categoriaId!: number;

  @IsNumber()
  @IsOptional()
  subcategoriaId?: number;

  @IsNumber()
  tiendaId!: number;

  @IsNumber()
  @IsOptional()
  proveedorId?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateImagenProductoDto)
  @IsOptional()
  imagenes?: CreateImagenProductoDto[];
}