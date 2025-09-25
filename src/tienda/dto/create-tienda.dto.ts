import { IsString, IsBoolean, IsOptional, IsUrl, IsNumber } from 'class-validator';

export class CreateTiendaDto {
  @IsString()
  nombre!: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsString()
  dominio!: string;

  @IsBoolean()
  @IsOptional()
  activa?: boolean;

  @IsBoolean()
  @IsOptional()
  esPrincipal?: boolean;

  @IsNumber()
  configWebId!: number;
}