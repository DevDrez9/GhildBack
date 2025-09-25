import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CalidadProducto } from 'generated/prisma/client';

export class UpdateCalidadDto {
  @IsEnum(CalidadProducto)
  calidad: CalidadProducto;

  @IsString()
  @IsOptional()
  notas?: string;
}