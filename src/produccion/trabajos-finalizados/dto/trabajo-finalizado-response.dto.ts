import { CalidadProducto } from "generated/prisma/client";

export class TrabajoFinalizadoResponseDto {
  id: number;
  trabajoEnProcesoId: number;
  fechaFinalizacion: Date;
  cantidadProducida: number;
  calidad: CalidadProducto;
  notas?: string;
  tiendaId: number;
  createdAt: Date;
  updatedAt: Date;

  // Relaciones
  trabajoEnProceso?: any;
  tienda?: any;
  movimientosInventario?: any[];

  constructor(partial: Partial<any>) {
    this.id = partial.id;
    this.trabajoEnProcesoId = partial.trabajoEnProcesoId;
    this.fechaFinalizacion = partial.fechaFinalizacion;
    this.cantidadProducida = partial.cantidadProducida;
    this.calidad = partial.calidad;
    this.notas = partial.notas || undefined;
    this.tiendaId = partial.tiendaId;
    this.createdAt = partial.createdAt;
    this.updatedAt = partial.updatedAt;

    // Mapear relaciones manualmente
    if (partial.trabajoEnProceso) {
      this.trabajoEnProceso = {
        id: partial.trabajoEnProceso.id,
        codigoTrabajo: partial.trabajoEnProceso.codigoTrabajo,
        cantidad: partial.trabajoEnProceso.cantidad,
        estado: partial.trabajoEnProceso.estado,
        parametrosTela: partial.trabajoEnProceso.parametrosTela ? {
          id: partial.trabajoEnProceso.parametrosTela.id,
          codigoReferencia: partial.trabajoEnProceso.parametrosTela.codigoReferencia,
          nombreModelo: partial.trabajoEnProceso.parametrosTela.nombreModelo,
          producto: partial.trabajoEnProceso.parametrosTela.producto ? {
            id: partial.trabajoEnProceso.parametrosTela.producto.id,
            nombre: partial.trabajoEnProceso.parametrosTela.producto.nombre
          } : undefined
        } : undefined,
        costurero: partial.trabajoEnProceso.costurero ? {
          id: partial.trabajoEnProceso.costurero.id,
          nombre: partial.trabajoEnProceso.costurero.nombre,
          apellido: partial.trabajoEnProceso.costurero.apellido
        } : undefined
      };
    }

    if (partial.tienda) {
      this.tienda = {
        id: partial.tienda.id,
        nombre: partial.tienda.nombre
      };
    }

    if (partial.movimientosInventario) {
      this.movimientosInventario = partial.movimientosInventario.map(movimiento => ({
        id: movimiento.id,
        tipo: movimiento.tipo,
        cantidad: movimiento.cantidad,
        motivo: movimiento.motivo,
        createdAt: movimiento.createdAt
      }));
    }
  }
}