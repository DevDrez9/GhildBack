import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateCategoriaDto {
  @IsString()
  nombre!: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsNumber()
  tiendaId!: number;
}