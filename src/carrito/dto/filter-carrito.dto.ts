import { IsString, IsOptional, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export class FilterCarritoDto {
  @IsString()
  @IsOptional()
  estado?: string;

  @IsString()
  @IsOptional()
  cliente?: string;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  tiendaId?: number;

  @IsString()
  @IsOptional()
  fechaInicio?: string;

  @IsString()
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