import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';
import { EstadoTransferencia, TipoDestinoTransferencia, TipoOrigenTransferencia } from 'generated/prisma/client';


export class CreateTransferenciaInventarioDto {
  @IsString()
  @IsOptional()
  codigo?: string;

  @IsEnum(EstadoTransferencia)
  @IsOptional()
  estado?: EstadoTransferencia;

  @IsString()
  @IsOptional()
  motivo?: string;

  @IsEnum(TipoOrigenTransferencia)
  origenTipo!: TipoOrigenTransferencia;

  @IsNumber()
  origenId!: number;

  @IsEnum(TipoDestinoTransferencia)
  destinoTipo!: TipoDestinoTransferencia;

  @IsNumber()
  destinoId!: number;

  @IsNumber()
  cantidad!: number;

  @IsNumber()
  productoId!: number;

  @IsNumber()
  usuarioId!: number;
}