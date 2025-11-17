import { IsNumber, IsString, IsObject, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { EstadoTransferencia, TipoOrigenTransferencia, TipoDestinoTransferencia } from 'generated/prisma/client';

export class CreateTransferenciaInventarioDto {
  @IsString()
  @IsOptional()
  codigo?: string;

  /**
   * ✅ MODIFICADO: La cantidad a transferir ahora es un objeto por tallas.
   * @example { "S": 5, "M": 10 }
   */
  @IsObject()
  @IsNotEmpty()
  cantidad!: Record<string, number>;

  @IsNumber()
  productoId!: number;

  @IsNumber()
  usuarioId!: number;

  @IsEnum(TipoOrigenTransferencia)
  origenTipo!: TipoOrigenTransferencia;

  @IsNumber()
  origenId!: number;
  
  @IsEnum(TipoDestinoTransferencia)
  destinoTipo!: TipoDestinoTransferencia;

  @IsNumber()
  destinoId!: number;

  @IsString()
  @IsOptional()
  motivo?: string;
  
  @IsEnum(EstadoTransferencia)
  @IsOptional()
  estado?: EstadoTransferencia;
}