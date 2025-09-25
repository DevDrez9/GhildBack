import { PartialType } from '@nestjs/swagger';
import { CreateInventarioTelaDto } from './create-inventario-tela.dto';

export class UpdateInventarioTelaDto extends PartialType(CreateInventarioTelaDto) {}
