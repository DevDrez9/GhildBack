import { PartialType } from '@nestjs/swagger';
import { FilterTrabajoFinalizadoDto } from './create-trabajos-finalizado.dto';


export class UpdateTrabajosFinalizadoDto extends PartialType(FilterTrabajoFinalizadoDto) {}
