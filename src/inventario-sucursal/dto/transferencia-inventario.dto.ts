import { IsNumber, IsString, IsEnum, IsNotEmpty, IsObject } from 'class-validator';

export class TransferenciaInventarioDto {
  /**
   * ✅ MODIFICADO: La cantidad a transferir ahora es un objeto por tallas.
   * @example { "S": 5, "L": 3 }
   */
  @IsObject()
  @IsNotEmpty()
  cantidad!: Record<string, number>;

  @IsString()
  motivo!: string;
  
  // El resto de los campos para origen y destino permanecen igual
  @IsEnum(['FABRICA', 'SUCURSAL'])
  origenTipo!: string;

  @IsNumber()
  origenId!: number;

  @IsEnum(['FABRICA', 'SUCURSAL'])
  destinoTipo!: string;

  @IsNumber()
  destinoId!: number;
}