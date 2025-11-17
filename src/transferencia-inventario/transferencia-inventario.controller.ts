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
import { TransferenciaInventarioService } from './transferencia-inventario.service';
import { CreateTransferenciaInventarioDto } from './dto/create-transferencia-inventario.dto';
import { UpdateTransferenciaInventarioDto } from './dto/update-transferencia-inventario.dto';
import { UpdateEstadoTransferenciaDto } from './dto/update-estado-transferencia.dto';
import { FilterTransferenciaInventarioDto } from './dto/filter-transferencia-inventario.dto';

@Controller('transferencias-inventario')
export class TransferenciaInventarioController {
  constructor(private readonly transferenciaInventarioService: TransferenciaInventarioService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createTransferenciaInventarioDto: CreateTransferenciaInventarioDto) {
    return this.transferenciaInventarioService.create(createTransferenciaInventarioDto);
  }

  @Get()
  findAll(@Query() filterTransferenciaInventarioDto: FilterTransferenciaInventarioDto) {
    return this.transferenciaInventarioService.findAll(filterTransferenciaInventarioDto);
  }

   @Get(':id')
  findOne(@Param('id') id: string) {
    return this.transferenciaInventarioService.findOne(+id);
  }

  @Get('estadisticas')
  getEstadisticas(@Query('tiendaId') tiendaId?: string) {
    return this.transferenciaInventarioService.getEstadisticas(tiendaId ? +tiendaId : undefined);
  }

  @Get('producto/:productoId')
  getTransferenciasPorProducto(@Param('productoId') productoId: string) {
    return this.transferenciaInventarioService.getTransferenciasPorProducto(+productoId);
  }

  @Get('codigo/:codigo')
  findByCodigo(@Param('codigo') codigo: string) {
    return this.transferenciaInventarioService.findByCodigo(codigo);
  }

 

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTransferenciaInventarioDto: UpdateTransferenciaInventarioDto) {
    return this.transferenciaInventarioService.update(+id, updateTransferenciaInventarioDto);
  }

 

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.transferenciaInventarioService.remove(+id);
  }


   @Patch(':id/estado')
  updateEstado(@Param('id') id: string, @Body() updateEstadoTransferenciaDto: UpdateEstadoTransferenciaDto) {
    return this.transferenciaInventarioService.updateEstado(+id, updateEstadoTransferenciaDto);
  }
}