import { IsString, IsOptional, IsNumber, IsDateString, IsEnum } from 'class-validator';
import { EstadoTrabajo } from 'generated/prisma/client';

export class CreateTrabajoDto {
  @IsString()
  @IsOptional()
  codigoTrabajo?: string;

  @IsNumber()
  parametrosTelaId: number;

  @IsNumber()
  @IsOptional()
  costureroId?: number;

  @IsEnum(EstadoTrabajo)
  @IsOptional()
  estado?: EstadoTrabajo;

  @IsNumber()
  cantidad: number;

  @IsNumber()
  tiendaId: number;

  @IsDateString()
  @IsOptional()
  fechaInicio?: string;

  @IsDateString()
  @IsOptional()
  fechaFinEstimada?: string;

  @IsString()
  @IsOptional()
  notas?: string;

  
}