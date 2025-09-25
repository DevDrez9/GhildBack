import { IsEnum } from 'class-validator';
import { EstadoCosturero } from 'generated/prisma/client';


export class UpdateEstadoCostureroDto {
  @IsEnum(EstadoCosturero)
  estado: EstadoCosturero;
}