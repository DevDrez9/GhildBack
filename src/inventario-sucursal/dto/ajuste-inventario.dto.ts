import { IsNumber, IsString, IsOptional, IsObject, IsNotEmpty } from 'class-validator';

export class AjusteInventarioDto {
  /**
   * ✅ MODIFICADO: La cantidad a ajustar ahora es un objeto por tallas.
   * @example { "S": 5, "M": -2 }
   */
  @IsObject()
  @IsNotEmpty()
  cantidad!: Record<string, number>;

  @IsString()
  motivo!: string;

  @IsString()
  @IsOptional()
  observaciones?: string;
}