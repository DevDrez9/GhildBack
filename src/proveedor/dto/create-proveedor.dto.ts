import { IsString, IsOptional, IsBoolean, IsEmail } from 'class-validator';

export class CreateProveedorDto {
  @IsString()
  nombre!: string;

  @IsString()
  @IsOptional()
  contacto?: string;

@IsString()
  @IsOptional()
 ciudad?:string
 @IsString()
  @IsOptional()
   pais?:string
    @IsString()
  @IsOptional()
   nit?:string
  
  @IsString()
  @IsOptional()
  ruc?: string;

  
@IsString()
  @IsOptional()
  direccion?: string;


    @IsString()
  @IsOptional()
  telefono?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}