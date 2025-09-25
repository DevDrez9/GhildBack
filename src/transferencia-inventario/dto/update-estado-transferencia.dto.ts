import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoTransferencia } from 'generated/prisma/client';


export class UpdateEstadoTransferenciaDto {
  @IsEnum(EstadoTransferencia)
  estado!: EstadoTransferencia;

  @IsString()
  @IsOptional()
  observaciones?: string;
}