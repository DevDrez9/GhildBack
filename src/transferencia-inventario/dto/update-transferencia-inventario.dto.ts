import { PartialType } from '@nestjs/swagger';
import { CreateTransferenciaInventarioDto } from './create-transferencia-inventario.dto';

export class UpdateTransferenciaInventarioDto extends PartialType(CreateTransferenciaInventarioDto) {}
