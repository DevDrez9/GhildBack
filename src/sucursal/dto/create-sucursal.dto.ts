import { IsString, IsBoolean, IsOptional, IsEmail, IsNumber } from 'class-validator';

export class CreateSucursalDto {
  @IsString()
  nombre!: string;

  @IsString()
  direccion!: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  responsable?: string;

  @IsBoolean()
  @IsOptional()
  activa?: boolean;

  @IsNumber()
  tiendaId!: number;
}