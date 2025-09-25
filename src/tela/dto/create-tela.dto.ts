import { IsNumber, IsString, IsOptional } from 'class-validator';

export class CreateTelaDto {
  @IsString()
  nombreComercial: string;

  @IsString()
  tipoTela: string;

  @IsString()
  composicion: string;

  @IsNumber()
  gramaje: number;

  @IsString()
  @IsOptional()
  acabado?: string;

  @IsNumber()
  @IsOptional()
  rendimiento?: number;

  @IsString()
  @IsOptional()
  colores?: string;

  @IsString()
  @IsOptional()
  nota?: string;

  @IsString()
  @IsOptional()
  estado?: string;

  @IsNumber()
  @IsOptional()
  proveedorId?: number;

  @IsNumber()
  @IsOptional()
  parametrosFisicosId?: number; // UN solo parámetro por tela
}