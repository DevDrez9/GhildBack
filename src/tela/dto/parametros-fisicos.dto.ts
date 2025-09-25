import { IsNumber, IsBoolean, IsOptional, IsString } from 'class-validator';

export class ParametrosFisicosTelaDto {
  @IsNumber()
  anchoTela!: number;

  @IsBoolean()
  @IsOptional()
  tubular?: boolean;

  @IsString()
  @IsOptional()
  notasTela?: string;
}