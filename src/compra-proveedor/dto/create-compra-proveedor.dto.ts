import { IsString, IsNumber, IsOptional, IsEnum, IsDecimal, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoCompra } from 'generated/prisma/client';


export class CreateCompraItemDto {
  @IsNumber()
  productoId!: number;

  @IsNumber()
  cantidad!: number;

  @IsDecimal()
  precio!: number;
}

export class CreateCompraTelaItemDto {
  @IsNumber()
  telaId!: number;

  @IsNumber()
  cantidad!: number;

  @IsDecimal()
  precioKG!: number;
}

export class CreateCompraProveedorDto {
  @IsNumber()
  proveedorId!: number;

  @IsEnum(EstadoCompra)
  @IsOptional()
  estado?: EstadoCompra;

  @IsDecimal()
  total!: number;

  @IsDecimal()
  subtotal!: number;

  @IsDecimal()
  @IsOptional()
  impuestos?: number;

  @IsString()
  @IsOptional()
  fechaEntrega?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCompraItemDto)
  @IsOptional()
  items?: CreateCompraItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCompraTelaItemDto)
  @IsOptional()
  itemsTela?: CreateCompraTelaItemDto[];
}