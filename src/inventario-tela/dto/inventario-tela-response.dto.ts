export class InventarioTelaResponseDto {
  id: number;
  proveedorId: number;
  telaId: number;
  cantidadRollos: number;
  presentacion: string;
  tipoTela: string;
  color: string;
  precioKG: number;
  pesoGrupo: number;
  importe: number;
  createdAt: Date;
  updatedAt: Date;

  // Relaciones
  proveedor?: any;
  tela?: any;

  constructor(partial: Partial<any>) {
    this.id = partial.id;
    this.proveedorId = partial.proveedorId;
    this.telaId = partial.telaId;
    this.cantidadRollos = partial.cantidadRollos;
    this.presentacion = partial.presentacion;
    this.tipoTela = partial.tipoTela;
    this.color = partial.color;
    this.precioKG = partial.precioKG;
    this.pesoGrupo = partial.pesoGrupo;
    this.importe = partial.importe;
    this.createdAt = partial.createdAt;
    this.updatedAt = partial.updatedAt;

    // Mapear relaciones
    if (partial.proveedor) {
      this.proveedor = {
        id: partial.proveedor.id,
        nombre: partial.proveedor.nombre,
        contacto: partial.proveedor.contacto
      };
    }

    if (partial.tela) {
      this.tela = {
        id: partial.tela.id,
        nombreComercial: partial.tela.nombreComercial,
        tipoTela: partial.tela.tipoTela,
        composicion: partial.tela.composicion
      };
    }
  }
}