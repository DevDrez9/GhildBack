export class ParametrosFisicosResponseDto {
  id: number;
  anchoTela: number;
  tubular: boolean;
  notasTela?: string;
  telaId: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(parametros: any) {
    this.id = parametros.id;
    this.anchoTela = parametros.anchoTela;
    this.tubular = parametros.tubular;
    this.notasTela = parametros.notasTela;
    this.telaId = parametros.telaId;
    this.createdAt = parametros.createdAt;
    this.updatedAt = parametros.updatedAt;
  }
}

export class TelaResponseDto {
  id: number;
  nombreComercial: string;
  tipoTela: string;
  composicion: string;
  gramaje: number;
  acabado?: string;
  rendimiento?: number;
  colores: string;
  nota?: string;
  estado: string;
  proveedorId: number;
  createdAt: Date;
  updatedAt: Date;
  proveedor?: any;
  parametrosFisicos?: ParametrosFisicosResponseDto;
  inventarioTelas?: any[];

  constructor(tela: any) {
    this.id = tela.id;
    this.nombreComercial = tela.nombreComercial;
    this.tipoTela = tela.tipoTela;
    this.composicion = tela.composicion;
    this.gramaje = tela.gramaje;
    this.acabado = tela.acabado;
    this.rendimiento = tela.rendimiento;
    this.colores = tela.colores;
    this.nota = tela.nota;
    this.estado = tela.estado;
    this.proveedorId = tela.proveedorId;
    this.createdAt = tela.createdAt;
    this.updatedAt = tela.updatedAt;
    this.proveedor = tela.proveedor;
    this.parametrosFisicos = tela.parametrosFisicos 
      ? new ParametrosFisicosResponseDto(tela.parametrosFisicos)
      : undefined;
    this.inventarioTelas = tela.inventarioTelas;
  }
}