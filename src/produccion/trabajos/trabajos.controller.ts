import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { TrabajosService } from './trabajos.service';
import { CreateTrabajoDto } from './dto/create-trabajo.dto';
import { UpdateTrabajoDto } from './dto/update-trabajo.dto';
import { UpdateEstadoTrabajoDto } from './dto/update-estado-trabajo.dto';
import { CompletarTrabajoDto } from './dto/completar-trabajo.dto';
import { FilterTrabajoDto } from './dto/filter-trabajo.dto';

@Controller('trabajos')
export class TrabajosController {
  constructor(private readonly trabajosService: TrabajosService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createTrabajoDto: CreateTrabajoDto) {
    return this.trabajosService.create(createTrabajoDto);
  }

  @Get()
  findAll(@Query() filterTrabajoDto: FilterTrabajoDto) {
    return this.trabajosService.findAll(filterTrabajoDto);
  }

  @Get('estadisticas')
  getEstadisticas(@Query('tiendaId') tiendaId?: string) {
    return this.trabajosService.getEstadisticas(tiendaId ? +tiendaId : undefined);
  }

  @Get('codigo/:codigo')
  findByCodigo(@Param('codigo') codigo: string) {
    return this.trabajosService.findByCodigo(codigo);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.trabajosService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTrabajoDto: UpdateTrabajoDto) {
    return this.trabajosService.update(+id, updateTrabajoDto);
  }

  @Patch(':id/estado')
  updateEstado(@Param('id') id: string, @Body() updateEstadoDto: UpdateEstadoTrabajoDto) {
    return this.trabajosService.updateEstado(+id, updateEstadoDto);
  }

  @Patch(':id/asignar-costurero/:costureroId')
  asignarCosturero(@Param('id') id: string, @Param('costureroId') costureroId: string) {
    return this.trabajosService.asignarCosturero(+id, +costureroId);
  }

  @Patch(':id/iniciar')
  iniciarTrabajo(@Param('id') id: string) {
    return this.trabajosService.iniciarTrabajo(+id);
  }

  @Patch(':id/pausar')
  pausarTrabajo(@Param('id') id: string) {
    return this.trabajosService.pausarTrabajo(+id);
  }

  @Patch(':id/completar')
  completarTrabajo(@Param('id') id: string, @Body() completarDto: CompletarTrabajoDto) {
    return this.trabajosService.completarTrabajo(+id, completarDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.trabajosService.remove(+id);
  }

  @Get('estadisticas/cumplimiento')
  getEstadisticasCumplimiento(@Query('tiendaId') tiendaId?: string) {
    return this.trabajosService.getEstadisticasCumplimiento(tiendaId ? +tiendaId : undefined);
  }
}