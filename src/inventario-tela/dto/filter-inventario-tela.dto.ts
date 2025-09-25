import { IsOptional, IsNumber, IsString } from 'class-validator';

export class FilterInventarioTelaDto {
  @IsNumber()
  @IsOptional()
  proveedorId?: number;

  @IsNumber()
  @IsOptional()
  telaId?: number;

  @IsString()
  @IsOptional()
  tipoTela?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  presentacion?: string;

  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  limit?: number;
}