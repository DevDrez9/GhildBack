import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class FilterProveedorDto {
  @IsString()
  @IsOptional()
  search?: string;

  
  @IsOptional()
  @Type(() => Boolean) 
    @IsBoolean()
  activo?: boolean;

  @IsString()
  @IsOptional()
  ruc?: string;
}