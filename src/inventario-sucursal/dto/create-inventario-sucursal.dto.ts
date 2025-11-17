import { IsNumber, IsObject, IsOptional } from 'class-validator';

export class CreateInventarioSucursalDto {
  @IsNumber()
  productoId!: number;

  @IsNumber()
  sucursalId!: number;

  @IsNumber()
  tiendaId!: number;

  /**
   * ✅ MODIFICADO: El stock inicial ahora es un objeto por tallas.
   * @example { "S": 10, "M": 15 }
   */
  @IsObject()
  @IsOptional()
  stock?: Record<string, number>;

  @IsNumber()
  @IsOptional()
  stockMinimo?: number;
}