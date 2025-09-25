import { PartialType } from '@nestjs/swagger';
import { CreateTelaDto } from './create-tela.dto';

export class UpdateTelaDto extends PartialType(CreateTelaDto) {}
