import { IsNumber, IsBoolean, IsString, IsOptional, Min } from 'class-validator';

export class CreateParametrosFisicosTelaDto {
  @IsString()
  nombre: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsNumber()
  @Min(0)
  anchoTela: number;

  @IsBoolean()
  @IsOptional()
  tubular?: boolean;

  @IsString()
  @IsOptional()
  notasTela?: string;

  @IsNumber()
  @IsOptional()
  telaId?: number; // Opcional: para asignar a una tela al crearlo
}