import { IsNumber, IsString, IsOptional } from 'class-validator';

export class CreateInventarioTelaDto {
  @IsNumber()
  proveedorId!: number;

  @IsNumber()
  telaId!: number;

  @IsNumber()
  cantidadRollos!: number;

  @IsString()
  presentacion!: string;

  @IsString()
  tipoTela!: string;

  @IsString()
  color!: string;

  @IsNumber()
  precioKG!: number;

  @IsNumber()
  pesoGrupo!: number;

  @IsNumber()
  @IsOptional()
  importe?: number;
}