import { PartialType } from '@nestjs/swagger';
import { CreateInventarioTiendaDto } from './create-inventario-tienda.dto';

export class UpdateInventarioTiendaDto extends PartialType(CreateInventarioTiendaDto) {}
