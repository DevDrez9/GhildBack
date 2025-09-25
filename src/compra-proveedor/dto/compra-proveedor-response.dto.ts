import { EstadoCompra } from "generated/prisma/client";

export class CompraItemResponseDto {
  id: number;
  cantidad: number;
  precio: number;
  productoId: number;
  compraId: number;
  createdAt: Date;
  updatedAt: Date;
  producto?: any;

  constructor(item: any) {
    this.id = item.id;
    this.cantidad = item.cantidad;
    this.precio = item.precio;
    this.productoId = item.productoId;
    this.compraId = item.compraId;
    this.createdAt = item.createdAt;
    this.updatedAt = item.updatedAt;
    this.producto = item.producto;
  }
}

export class CompraTelaItemResponseDto {
  id: number;
  cantidad: number;
  precioKG: number;
  telaId: number;
  compraId: number;
  createdAt: Date;
  updatedAt: Date;
  tela?: any;

  constructor(item: any) {
    this.id = item.id;
    this.cantidad = item.cantidad;
    this.precioKG = item.precioKG;
    this.telaId = item.telaId;
    this.compraId = item.compraId;
    this.createdAt = item.createdAt;
    this.updatedAt = item.updatedAt;
    this.tela = item.tela;
  }
}

export class CompraProveedorResponseDto {
  id: number;
  numeroCompra: string;
  proveedorId: number;
  estado: EstadoCompra;
  total: number;
  subtotal: number;
  impuestos?: number;
  fechaEntrega?: Date;
  createdAt: Date;
  updatedAt: Date;
  proveedor?: any;
  items: CompraItemResponseDto[];
  itemsTela: CompraTelaItemResponseDto[];
  movimientos?: any[];

  constructor(compra: any) {
    this.id = compra.id;
    this.numeroCompra = compra.numeroCompra;
    this.proveedorId = compra.proveedorId;
    this.estado = compra.estado;
    this.total = compra.total;
    this.subtotal = compra.subtotal;
    this.impuestos = compra.impuestos;
    this.fechaEntrega = compra.fechaEntrega;
    this.createdAt = compra.createdAt;
    this.updatedAt = compra.updatedAt;
    this.proveedor = compra.proveedor;
    this.items = compra.items ? compra.items.map((item: any) => new CompraItemResponseDto(item)) : [];
    this.itemsTela = compra.itemsTela ? compra.itemsTela.map((item: any) => new CompraTelaItemResponseDto(item)) : [];
    this.movimientos = compra.movimientos;
  }
}