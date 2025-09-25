import { IsOptional, IsString, IsNumber, IsEnum, IsDateString } from 'class-validator';
import { EstadoTrabajo } from 'generated/prisma/client';

export class FilterTrabajoDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(EstadoTrabajo)
  @IsOptional()
  estado?: EstadoTrabajo;

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
  fechaInicioDesde?: string;

  @IsDateString()
  @IsOptional()
  fechaInicioHasta?: string;

  @IsDateString()
  @IsOptional()
  fechaFinDesde?: string;

  @IsDateString()
  @IsOptional()
  fechaFinHasta?: string;

  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  limit?: number;
}