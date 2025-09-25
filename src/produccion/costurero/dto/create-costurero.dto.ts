import { IsString, IsOptional, IsEmail, IsDateString, IsNumber, IsEnum } from 'class-validator';
import { EstadoCosturero } from 'generated/prisma/client';


export class CreateCostureroDto {
  @IsString()
  nombre: string;

  @IsString()
  apellido: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  direccion?: string;

  @IsEnum(EstadoCosturero)
  @IsOptional()
  estado?: EstadoCosturero;

  @IsDateString()
  fechaInicio: string;

  @IsString()
  @IsOptional()
  nota?: string;

  @IsNumber()
  @IsOptional()
  usuarioId?: number;

  @IsNumber()
  tiendaId: number;
}