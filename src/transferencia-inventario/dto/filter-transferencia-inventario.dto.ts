import { IsEnum, IsOptional, IsNumber, IsString, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { EstadoTransferencia, TipoDestinoTransferencia, TipoOrigenTransferencia } from 'generated/prisma/client';

export class FilterTransferenciaInventarioDto {
  @IsEnum(EstadoTransferencia)
  @IsOptional()
  estado?: EstadoTransferencia;

  @IsEnum(TipoOrigenTransferencia)
  @IsOptional()
  origenTipo?: TipoOrigenTransferencia;

  @IsEnum(TipoDestinoTransferencia)
  @IsOptional()
  destinoTipo?: TipoDestinoTransferencia;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  productoId?: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  usuarioId?: number;

  @IsString()
  @IsOptional()
  codigo?: string;

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