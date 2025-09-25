export class ParametrosFisicosTelaResponseDto {
  id: number;
  nombre: string;
  descripcion?: string;
  anchoTela: number;
  tubular: boolean;
  notasTela?: string;
  telaId?: number;
  tela?: {
    id?: number;
    nombreComercial?: string;
    tipoTela?: string;
    proveedor?: {
      id?: number;
      nombre?: string;
      contacto?: string;
    };
  };
  createdAt?: Date;
  updatedAt?: Date;

  constructor(partial: Partial<any>) {
    this.id = partial.id;
    this.nombre = partial.nombre;
    this.descripcion = partial.descripcion;
    this.anchoTela = partial.anchoTela;
    this.tubular = partial.tubular;
    this.notasTela = partial.notasTela;
    this.telaId = partial.telaId;
    this.createdAt = partial.createdAt;
    this.updatedAt = partial.updatedAt;
    
    // Mapear la relación tela manualmente
    if (partial.tela) {
      this.tela = {
        id: partial.tela.id,
        nombreComercial: partial.tela.nombreComercial,
        tipoTela: partial.tela.tipoTela,
        proveedor: partial.tela.proveedor ? {
          id: partial.tela.proveedor.id,
          nombre: partial.tela.proveedor.nombre,
          contacto: partial.tela.proveedor.contacto
        } : undefined
      };
    }
  }
}