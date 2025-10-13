// trabajo-finalizado/dto/trabajo-agregado-response.dto.ts

export class TrabajoAgregadoResponseDto {
    productoId: number;
    nombreProducto: string;
    totalCosto: number;
    totalCantidadProducida: number;

    constructor(partial: Partial<TrabajoAgregadoResponseDto>) {
        this.productoId = partial.productoId || 0    ;
        this.nombreProducto = partial.nombreProducto || "";
        this.totalCosto = partial.totalCosto || 0;
        
        this.totalCantidadProducida = typeof partial.totalCantidadProducida === 'string'
                             ? parseFloat( partial.totalCantidadProducida)
                             :  partial.totalCantidadProducida || 0;
    }
}