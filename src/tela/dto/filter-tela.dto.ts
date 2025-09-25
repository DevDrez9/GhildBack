import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';

export class FilterTelaDto {
  @IsString()
  @IsOptional()
  tipoTela?: string;

  @IsString()
  @IsOptional()
  composicion?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsNumber()
  @IsOptional()
  proveedorId?: number;

  @IsString()
  @IsOptional()
  estado?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsNumber()
  @IsOptional()
  parametrosFisicosId?: number; // ← Agrega esta propiedad

  @IsBoolean()
  @IsOptional()
  conParametrosFisicos?: boolean;
}