import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoTrabajo } from 'generated/prisma/client';


export class UpdateEstadoTrabajoDto {
  @IsEnum(EstadoTrabajo)
  estado: EstadoTrabajo;

  @IsString()
  @IsOptional()
  notas?: string;
}