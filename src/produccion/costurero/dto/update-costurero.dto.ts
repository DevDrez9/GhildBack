import { PartialType } from '@nestjs/swagger';
import { CreateCostureroDto } from './create-costurero.dto';

export class UpdateCostureroDto extends PartialType(CreateCostureroDto) {}
