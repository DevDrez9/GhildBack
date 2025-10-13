import { Decimal } from "@prisma/client/runtime/library";

export class VentaAgregadaResponseDto {
    productoId: number;
    nombreProducto: string;
    totalUnidadesVendidas: number;
    totalIngresos: number;

    constructor(data: any) {
        this.productoId = data.productoId || data.id;
        this.nombreProducto = data.producto?.nombre || data.nombreProducto || 'Desconocido';
        this.totalUnidadesVendidas = data._sum?.cantidad || data.totalUnidadesVendidas || 0;
        // Asume que la columna 'total' de VentaItem representa el subtotal,
        // o usa la suma de precio * cantidad. Para simplificar, usamos el total sumado.
        this.totalIngresos = typeof data.totalIngresos === 'string'
                             ? parseFloat(data.totalIngresos)
                             : data.totalIngresos || 0;
    }
}