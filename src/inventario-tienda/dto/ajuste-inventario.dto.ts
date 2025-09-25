import { IsNumber, IsString, IsOptional } from 'class-validator';

export class AjusteInventarioDto {
  @IsNumber()
  cantidad!: number;

  @IsString()
  motivo!: string;

  @IsString()
  @IsOptional()
  observaciones?: string;
}