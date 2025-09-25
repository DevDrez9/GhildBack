import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoCompra } from 'generated/prisma/client';


export class UpdateEstadoCompraDto {
  @IsEnum(EstadoCompra)
  estado!: EstadoCompra;

  @IsString()
  @IsOptional()
  observaciones?: string;
}