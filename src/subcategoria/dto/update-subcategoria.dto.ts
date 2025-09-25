import { PartialType } from '@nestjs/swagger';
import { CreateSubcategoriaDto } from './create-subcategoria.dto';

export class UpdateSubcategoriaDto extends PartialType(CreateSubcategoriaDto) {}
