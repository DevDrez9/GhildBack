import { IsOptional, IsString, IsNumber, IsEnum, IsDateString } from 'class-validator';
import { CalidadProducto } from 'generated/prisma/client';

export class FilterTrabajoFinalizadoDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(CalidadProducto)
  @IsOptional()
  calidad?: CalidadProducto;

  @IsNumber()
  @IsOptional()
  costureroId?: number;

  @IsNumber()
  @IsOptional()
  parametrosTelaId?: number;

  @IsNumber()
  @IsOptional()
  tiendaId?: number;

  @IsDateString()
  @IsOptional()
  fechaDesde?: string;

  @IsDateString()
  @IsOptional()
  fechaHasta?: string;

  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  limit?: number;
}