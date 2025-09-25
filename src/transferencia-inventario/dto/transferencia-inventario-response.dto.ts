import { EstadoTransferencia, TipoDestinoTransferencia, TipoOrigenTransferencia } from "generated/prisma/client";

export class TransferenciaInventarioResponseDto {
  id: number;
  codigo: string;
  estado: EstadoTransferencia;
  motivo?: string;
  origenTipo: TipoOrigenTransferencia;
  origenId: number;
  destinoTipo: TipoDestinoTransferencia;
  destinoId: number;
  cantidad: number;
  productoId: number;
  usuarioId: number;
  createdAt: Date;
  updatedAt: Date;
  producto?: any;
  usuario?: any;
  movimientos?: any[];
  origen?: any;
  destino?: any;

  constructor(transferencia: any) {
    this.id = transferencia.id;
    this.codigo = transferencia.codigo;
    this.estado = transferencia.estado;
    this.motivo = transferencia.motivo;
    this.origenTipo = transferencia.origenTipo;
    this.origenId = transferencia.origenId;
    this.destinoTipo = transferencia.destinoTipo;
    this.destinoId = transferencia.destinoId;
    this.cantidad = transferencia.cantidad;
    this.productoId = transferencia.productoId;
    this.usuarioId = transferencia.usuarioId;
    this.createdAt = transferencia.createdAt;
    this.updatedAt = transferencia.updatedAt;
    this.producto = transferencia.producto;
    this.usuario = transferencia.usuario;
    this.movimientos = transferencia.movimientos;
    this.origen = transferencia.origen;
    this.destino = transferencia.destino;
  }
}