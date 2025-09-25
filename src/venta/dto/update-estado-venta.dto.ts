import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoVenta } from 'generated/prisma/client';


export class UpdateEstadoVentaDto {
  @IsEnum(EstadoVenta)
  estado!: EstadoVenta;

  @IsString()
  @IsOptional()
  observaciones?: string;
}