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
    telaInventarioId?: number; // Propiedad corregida
    producto?: any;
    tela?: {
        id: number;
        color: string;
        pesoGrupo: number;
        telaId: number;
        // La relación anidada para la Tela maestra
        tela: {
            id: number;
            nombreComercial: string; // Asumo este campo
            // Otros campos que quieras exponer de la Tela
        };
    };
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
        
        // ⭐ CORRECCIÓN 1: Mapear el campo telaInventarioId correctamente ⭐
        this.telaInventarioId = partial.telaId || undefined; 
        
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
            
            // ⭐ Mapeo de la relación anidada 'tela' ⭐
            let telaData: any = {};
            if (partial.tela.tela) {
                telaData = {
                    id: partial.tela.tela.id,
                    nombreComercial: partial.tela.tela.nombreComercial,
                    // Añade aquí cualquier otro campo de la Tela (ej. tipoTela, composicion)
                };
            }

            this.tela = {
                id: partial.tela.id,
                color: partial.tela.color,
                pesoGrupo: partial.tela.pesoGrupo,
                telaId: partial.tela.telaId,
                // ⭐ ASIGNACIÓN DEL OBJETO TELA ⭐
                tela: telaData,
            };
        }
    }
}