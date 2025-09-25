import { EstadoVenta, MetodoPago } from "generated/prisma/client";

export class VentaItemResponseDto {
  id: number;
  cantidad: number;
  precio: number;
  productoId: number;
  ventaId: number;
  createdAt: Date;
  updatedAt: Date;
  producto?: any;

  constructor(item: any) {
    this.id = item.id;
    this.cantidad = item.cantidad;
    this.precio = item.precio;
    this.productoId = item.productoId;
    this.ventaId = item.ventaId;
    this.createdAt = item.createdAt;
    this.updatedAt = item.updatedAt;
    this.producto = item.producto;
  }
}

export class VentaResponseDto {
  id: number;
  numeroVenta: string;
  cliente: string;
  telefono?: string;
  direccion?: string;
  estado: EstadoVenta;
  total: number;
  subtotal: number;
  impuestos?: number;
  metodoPago?: MetodoPago;
  tiendaId: number;
  sucursalId?: number;
  createdAt: Date;
  updatedAt: Date;
  items: VentaItemResponseDto[];
  tienda?: any;
  sucursal?: any;

  constructor(venta: any) {
    this.id = venta.id;
    this.numeroVenta = venta.numeroVenta;
    this.cliente = venta.cliente;
    this.telefono = venta.telefono;
    this.direccion = venta.direccion;
    this.estado = venta.estado;
    this.total = venta.total;
    this.subtotal = venta.subtotal;
    this.impuestos = venta.impuestos;
    this.metodoPago = venta.metodoPago;
    this.tiendaId = venta.tiendaId;
    this.sucursalId = venta.sucursalId;
    this.createdAt = venta.createdAt;
    this.updatedAt = venta.updatedAt;
    this.items = venta.items ? venta.items.map((item: any) => new VentaItemResponseDto(item)) : [];
    this.tienda = venta.tienda;
    this.sucursal = venta.sucursal;
  }
}