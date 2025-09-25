import { IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';
import { EstadoCosturero } from 'generated/prisma/client';

export class FilterCostureroDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(EstadoCosturero)
  @IsOptional()
  estado?: EstadoCosturero;

  @IsNumber()
  @IsOptional()
  tiendaId?: number;

  @IsNumber()
  @IsOptional()
  usuarioId?: number;

  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  limit?: number;
}