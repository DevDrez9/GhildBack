import { PartialType } from '@nestjs/swagger';
import { CreateInventarioSucursalDto } from './create-inventario-sucursal.dto';

export class UpdateInventarioSucursalDto extends PartialType(CreateInventarioSucursalDto) {}
