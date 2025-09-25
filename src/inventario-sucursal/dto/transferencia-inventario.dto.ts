import { IsNumber, IsString, IsEnum } from 'class-validator';

export class TransferenciaInventarioDto {
  @IsNumber()
  cantidad!: number;

  @IsString()
  motivo!: string;

  @IsEnum(['FABRICA', 'SUCURSAL'])
  origenTipo!: string;

  @IsNumber()
  origenId!: number;

  @IsEnum(['FABRICA', 'SUCURSAL'])
  destinoTipo!: string;

  @IsNumber()
  destinoId!: number;
}