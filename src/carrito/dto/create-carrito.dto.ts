import { IsString, IsOptional, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCarritoItemDto {
  @IsNumber()
  productoId!: number;

  @IsNumber()
  cantidad!: number;
}

export class CreateCarritoDto {
  @IsString()
  cliente!: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsString()
  @IsOptional()
  direccion?: string;

  @IsString()
  @IsOptional()
  notas?: string;

  @IsNumber()
  tiendaId!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCarritoItemDto)
  items!: CreateCarritoItemDto[];
}