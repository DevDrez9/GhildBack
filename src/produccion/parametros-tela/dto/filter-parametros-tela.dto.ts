import { IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';

export class FilterParametrosTelaDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  tipoTelaRecomendada?: string;

 
  @IsOptional()
  estadoPrenda?: string;

  @IsNumber()
  @IsOptional()
  productoId?: number;

  @IsNumber()
  @IsOptional()
  telaId?: number;

  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  limit?: number;
}