export class ParametrosTelaResponseDto {
  id: number;
  codigoReferencia: string;
  nombreModelo: string;
  tipoTelaRecomendada: string;
  estadoPrenda: string;
  fotoReferenciaUrl?: string;
  cantidadEstandarPorLote: number;
  tabla?: string;
  tallasDisponibles: string;
  consumoTelaPorTalla: any;
  consumoTelaPorLote: number;
  tiempoFabricacionPorUnidad: number;
  tiempoTotalPorLote: number;
  productoId?: number;
  telaId?: number;
  producto?: any;
  tela?: any;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<any>) {
    this.id = partial.id;
    this.codigoReferencia = partial.codigoReferencia;
    this.nombreModelo = partial.nombreModelo;
    this.tipoTelaRecomendada = partial.tipoTelaRecomendada;
    this.estadoPrenda = partial.estadoPrenda;
    this.fotoReferenciaUrl = partial.fotoReferenciaUrl || undefined;
    this.cantidadEstandarPorLote = partial.cantidadEstandarPorLote;
    this.tabla = partial.tabla || undefined;
    this.tallasDisponibles = partial.tallasDisponibles;
    this.consumoTelaPorTalla = partial.consumoTelaPorTalla;
    this.consumoTelaPorLote = partial.consumoTelaPorLote;
    this.tiempoFabricacionPorUnidad = partial.tiempoFabricacionPorUnidad;
    this.tiempoTotalPorLote = partial.tiempoTotalPorLote;
    this.productoId = partial.productoId || undefined;
    this.telaId = partial.telaId || undefined;
    this.createdAt = partial.createdAt;
    this.updatedAt = partial.updatedAt;

    // Mapear relaciones manualmente
    if (partial.producto) {
      this.producto = {
        id: partial.producto.id,
        nombre: partial.producto.nombre,
        sku: partial.producto.sku
      };
    }

    if (partial.tela) {
      this.tela = {
        id: partial.tela.id,
        nombreComercial: partial.tela.nombreComercial,
        tipoTela: partial.tela.tipoTela
      };
    }
  }
}