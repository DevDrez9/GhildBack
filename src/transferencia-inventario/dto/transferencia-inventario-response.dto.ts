import { EstadoTransferencia, TipoDestinoTransferencia, TipoOrigenTransferencia } from "generated/prisma/client";

export class TransferenciaInventarioResponseDto {
  id: number;
  codigo: string;
  estado: EstadoTransferencia;
  
  /** ✅ MODIFICADO: La cantidad es ahora un objeto. */
  cantidad: Record<string, number>;
  
  motivo?: string | null;
  origenTipo: TipoOrigenTransferencia;
  origenId: number;
  destinoTipo: TipoDestinoTransferencia;
  destinoId: number;
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
    
    // Lógica para manejar el objeto de cantidad
    this.cantidad = (typeof transferencia.cantidad === 'object' && transferencia.cantidad !== null && !Array.isArray(transferencia.cantidad))
      ? transferencia.cantidad
      : {};
      
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