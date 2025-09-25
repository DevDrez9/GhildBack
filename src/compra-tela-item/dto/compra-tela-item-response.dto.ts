export class CompraTelaItemResponseDto {
  id: number;
  cantidad: number;
  precioKG: number;
  telaId: number;
  compraId: number;
  createdAt: Date;
  updatedAt: Date;
  tela?: any;
  compra?: any;
  importeTotal: number;

  constructor(item: any) {
    this.id = item.id;
    this.cantidad = item.cantidad;
    this.precioKG = item.precioKG;
    this.telaId = item.telaId;
    this.compraId = item.compraId;
    this.createdAt = item.createdAt;
    this.updatedAt = item.updatedAt;
    this.tela = item.tela;
    this.compra = item.compra;
    this.importeTotal = item.cantidad * item.precioKG;
  }
}