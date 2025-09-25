import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CalculoConsumoDto {
  @IsNumber()
  @IsOptional()
  cantidad?: number;

  @IsString()
  @IsOptional()
  talla?: string;

  @IsNumber()
  @IsOptional()
  multiplicador?: number;
}