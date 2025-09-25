import { PartialType } from '@nestjs/swagger';
import { CreateTrabajoDto } from './create-trabajo.dto';

export class UpdateTrabajoDto extends PartialType(CreateTrabajoDto) {}
