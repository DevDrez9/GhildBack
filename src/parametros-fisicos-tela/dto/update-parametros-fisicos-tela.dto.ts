import { PartialType } from '@nestjs/swagger';
import { CreateParametrosFisicosTelaDto } from './create-parametros-fisicos-tela.dto';

export class UpdateParametrosFisicosTelaDto extends PartialType(CreateParametrosFisicosTelaDto) {}
