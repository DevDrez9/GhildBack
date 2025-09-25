import { PartialType } from '@nestjs/swagger';
import { CreateCompraTelaItemDto } from './create-compra-tela-item.dto';

export class UpdateCompraTelaItemDto extends PartialType(CreateCompraTelaItemDto) {}
