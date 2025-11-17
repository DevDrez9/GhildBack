import { IsNumber, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { CalidadProducto } from 'generated/prisma/client';

export class CompletarTrabajoDto {
  @IsString()
  cantidadProducida: string;

  @IsDateString()
  fechaFinalizacion: string;

  @IsEnum(CalidadProducto)
  calidad: CalidadProducto;

  @IsString()
   @IsOptional()
  notas: string;

  @IsOptional()
  @IsNumber()
  tiendaId?: number;

  @IsOptional()
  @IsNumber()
  costo?:number;
}