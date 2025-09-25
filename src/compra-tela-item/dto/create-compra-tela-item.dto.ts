import { IsNumber, IsDecimal } from 'class-validator';

export class CreateCompraTelaItemDto {
  @IsNumber()
  cantidad!: number;

  @IsDecimal()
  precioKG!: number;

  @IsNumber()
  telaId!: number;

  @IsNumber()
  compraId!: number;
}