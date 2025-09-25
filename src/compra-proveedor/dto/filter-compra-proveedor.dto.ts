import { IsEnum, IsOptional, IsNumber, IsString, IsDateString } from 'class-validator';

import { Transform } from 'class-transformer';
import { EstadoCompra } from 'generated/prisma/client';

export class FilterCompraProveedorDto {
  @IsEnum(EstadoCompra)
  @IsOptional()
  estado?: EstadoCompra;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  proveedorId?: number;

  @IsString()
  @IsOptional()
  numeroCompra?: string;

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