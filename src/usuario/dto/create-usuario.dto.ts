import { IsString, IsEmail, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { Rol } from 'generated/prisma/client';


export class CreateUsuarioDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;

  @IsString()
  nombre!: string;

  @IsString()
  @IsOptional()
  apellido?: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsEnum(Rol)
  @IsOptional()
  rol?: Rol;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}