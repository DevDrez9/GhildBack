import { IsString, IsOptional, IsNumber, IsJSON, IsEnum } from 'class-validator';


export class CreateParametrosTelaDto {
  @IsString()
  codigoReferencia: string;

  @IsString()
  nombreModelo: string;

  @IsString()
  @IsOptional()
  tipoTelaRecomendada: string;

  @IsString()
  estadoPrenda: string;

  @IsString()
  @IsOptional()
  fotoReferenciaUrl?: string;

  @IsNumber()
  cantidadEstandarPorLote: number;  

  @IsString()
  @IsOptional()
  tabla?: string;

  @IsString()
  @IsOptional()
  tallasDisponibles: string;

  @IsJSON()
  consumoTelaPorTalla: any; // JSON: { "S": 1.5, "M": 1.8, "L": 2.0 }

  @IsNumber()
  @IsOptional()
  consumoTelaPorLote: number;

  @IsNumber()
  tiempoFabricacionPorUnidad: number; // en horas

  @IsNumber()
  @IsOptional()
  tiempoTotalPorLote: number; // en horas

  @IsNumber()
  @IsOptional()
  productoId?: number;

  @IsNumber()
  @IsOptional()
  telaId?: number;
}