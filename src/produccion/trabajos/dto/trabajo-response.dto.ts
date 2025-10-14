import { EstadoTrabajo } from "generated/prisma/client";

export class TrabajoResponseDto {
  id: number;
  codigoTrabajo: string;
  parametrosTelaId: number;
  costureroId?: number;
  estado: EstadoTrabajo;
  cantidad: number;
  fechaInicio?: Date;
  fechaFinEstimada?: Date;
  fechaFinReal?: Date;
  notas?: string;
  tiendaId: number;
  
  pesoTotal:number;

  createdAt: Date;
  updatedAt: Date;

  // Relaciones
  parametrosTela?: any;
  costurero?: any;
  tienda?: any;
  trabajoFinalizado?: any;

  constructor(partial: Partial<any>) {
    this.id = partial.id;
    this.codigoTrabajo = partial.codigoTrabajo;
    this.parametrosTelaId = partial.parametrosTelaId;
    this.costureroId = partial.costureroId || undefined;
    this.estado = partial.estado;
    this.cantidad = partial.cantidad;
    this.fechaInicio = partial.fechaInicio || undefined;
    this.fechaFinEstimada = partial.fechaFinEstimada || undefined;
    this.fechaFinReal = partial.fechaFinReal || undefined;
    this.notas = partial.notas || undefined;
    this.tiendaId = partial.tiendaId;
    this.pesoTotal=partial.pesoTotal;
    this.createdAt = partial.createdAt;
    this.updatedAt = partial.updatedAt;

    // Mapear relaciones manualmente
    if (partial.parametrosTela) {
      this.parametrosTela = {
        id: partial.parametrosTela.id,
        codigoReferencia: partial.parametrosTela.codigoReferencia,
        fotoReferenciaUrl:partial.parametrosTela.fotoReferenciaUrl,
        nombreModelo: partial.parametrosTela.nombreModelo,
        producto: partial.parametrosTela.producto ? {
          id: partial.parametrosTela.producto.id,
          nombre: partial.parametrosTela.producto.nombre
        } : undefined,
        tela: partial.parametrosTela.tela ? {
          id: partial.parametrosTela.tela.id,
          nombreComercial: partial.parametrosTela.tela.nombreComercial
        } : undefined
      };
    }

    if (partial.costurero) {
      this.costurero = {
        id: partial.costurero.id,
        nombre: partial.costurero.nombre,
        apellido: partial.costurero.apellido,
        estado: partial.costurero.estado
      };
    }

    if (partial.tienda) {
      this.tienda = {
        id: partial.tienda.id,
        nombre: partial.tienda.nombre
      };
    }

    if (partial.trabajoFinalizado) {
      this.trabajoFinalizado = {
        id: partial.trabajoFinalizado.id,
        cantidadProducida: partial.trabajoFinalizado.cantidadProducida,
        calidad: partial.trabajoFinalizado.calidad,
        fechaFinalizacion: partial.trabajoFinalizado.fechaFinalizacion,
        notas: partial.trabajoFinalizado.notas || undefined
      };
    }
  }
}