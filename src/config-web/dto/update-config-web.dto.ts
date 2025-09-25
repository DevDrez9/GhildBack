import { PartialType } from '@nestjs/swagger';
import { CreateConfigWebDto } from './create-config-web.dto';

export class UpdateConfigWebDto extends PartialType(CreateConfigWebDto) {}
