import { IsString, IsNumber, IsOptional, IsEnum, IsArray, ValidateNested, IsDecimal } from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoVenta, MetodoPago } from 'generated/prisma/client';


export class CreateVentaItemDto {
  @IsNumber()
  productoId!: number;

  @IsNumber()
  cantidad!: number;

 @IsNumber()
  precio!: number;
}

export class CreateVentaDto {
  @IsString()
  cliente!: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsString()
  @IsOptional()
  direccion?: string;

  @IsEnum(EstadoVenta)
  @IsOptional()
  estado?: EstadoVenta;

  @IsNumber()
  total!: number;

 @IsNumber()
  subtotal!: number;

  @IsNumber()
  @IsOptional()
  impuestos?: number;

  @IsEnum(MetodoPago)
  @IsOptional()
  metodoPago?: MetodoPago;

  @IsNumber()
  tiendaId!: number;

  @IsNumber()
  @IsOptional()
  sucursalId?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVentaItemDto)
  items!: CreateVentaItemDto[];
}