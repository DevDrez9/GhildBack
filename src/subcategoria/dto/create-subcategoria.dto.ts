import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateSubcategoriaDto {
  @IsString()
  nombre!: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsNumber()
  @IsOptional()
  categoriaId?: number;
}