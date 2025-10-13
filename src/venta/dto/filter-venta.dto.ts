import { IsEnum, IsOptional, IsNumber, IsString, IsDateString } from 'class-validator';

import { Transform } from 'class-transformer';
import { EstadoVenta, MetodoPago } from 'generated/prisma/client';

export class FilterVentaDto {
  @IsEnum(EstadoVenta)
  @IsOptional()
  estado?: EstadoVenta;

  @IsEnum(MetodoPago)
  @IsOptional()
  metodoPago?: MetodoPago;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  tiendaId?: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  sucursalId?: number;

  @IsString()
  @IsOptional()
  cliente?: string;

@IsOptional()
@IsNumber()
  productoId?: number; 

  @IsString()
  @IsOptional()
  numeroVenta?: string;

  @IsDateString()
  @IsOptional()
  fechaInicio?: string;

  @IsDateString()
  @IsOptional()
  fechaFin?: string;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page?: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number;
}