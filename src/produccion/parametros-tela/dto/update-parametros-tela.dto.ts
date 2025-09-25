import { PartialType } from '@nestjs/swagger';
import { CreateParametrosTelaDto } from './create-parametros-tela.dto';

export class UpdateParametrosTelaDto extends PartialType(CreateParametrosTelaDto) {}
