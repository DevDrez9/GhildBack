import { IsString, IsNumber, IsOptional, IsUrl } from 'class-validator';

export class CreateBannerDto {
  @IsUrl()
  url!: string;

  @IsNumber()
  @IsOptional()
  orden?: number;

  @IsString()
  @IsOptional()
  titulo?: string;

  @IsString()
  @IsOptional()
  subtitulo?: string;

  @IsString()
  @IsOptional()
  enlace?: string;
}