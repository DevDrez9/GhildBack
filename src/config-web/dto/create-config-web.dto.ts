import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateBannerDto } from './create-banner.dto';


export class CreateConfigWebDto {
  @IsString()
  nombreSitio!: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;
   @IsString()
  @IsOptional()
  imagenQr?: string;

  @IsString()
  colorPrimario!: string;

  @IsString()
  colorSecundario!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBannerDto)
  @IsOptional()
  banners?: CreateBannerDto[];
}