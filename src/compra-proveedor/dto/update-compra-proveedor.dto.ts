import { PartialType } from '@nestjs/swagger';
import { CreateCompraProveedorDto } from './create-compra-proveedor.dto';

export class UpdateCompraProveedorDto extends PartialType(CreateCompraProveedorDto) {}
