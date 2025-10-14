import { IsInt, IsOptional, IsString, Min, IsDecimal, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCarritoItemDto {
  @IsInt()
  productoId: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  cantidad?: number;

  @IsString()
  @IsOptional()
  talla? :string;


 
}

export class CreateCarritoDto {
  @IsInt()
  tiendaId: number;

  @IsString()
  @IsOptional()
  cliente?: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsString()
  @IsOptional()
  direccion?: string;

  @IsString()
  @IsOptional()
  notas?: string;

  // Los ítems iniciales son opcionales
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateCarritoItemDto)
  items?: CreateCarritoItemDto[];

  // El clienteId lo obtendremos del token o del controlador, no del body.
  // Pero lo incluimos por si acaso.
  @IsInt()
  @IsOptional()
  clienteId?: number; 
}