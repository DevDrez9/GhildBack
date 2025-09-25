import { IsString, IsOptional } from 'class-validator';

export class UpdateEstadoCarritoDto {
  @IsString()
  estado!: string;

  @IsString()
  @IsOptional()
  observaciones?: string;
}