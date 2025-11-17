import { IsNumber, IsString, IsOptional, IsObject, IsNotEmpty } from 'class-validator';

// Un objeto para validar cada entrada de talla
class TallaCantidadDto {
    @IsNumber()
    cantidad: number;
}

export class AjusteInventarioDto {
  // CAMBIO: 'cantidad' ahora es un objeto de tallas y cantidades.
  // Ejemplo: { "S": 10, "M": -5, "L": 2 }
  @IsObject()
  @IsNotEmpty()
  cantidad!: Record<string, number>;

  @IsString()
  motivo!: string;

  @IsString()
  @IsOptional()
  observaciones?: string;
}