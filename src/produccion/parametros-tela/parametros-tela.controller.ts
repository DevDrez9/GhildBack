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
import { ParametrosTelaService } from './parametros-tela.service';
import { CreateParametrosTelaDto } from './dto/create-parametros-tela.dto';
import { UpdateParametrosTelaDto } from './dto/update-parametros-tela.dto';
import { FilterParametrosTelaDto } from './dto/filter-parametros-tela.dto';
import { CalculoConsumoDto } from './dto/calculo-consumo.dto';

@Controller('parametros-tela')
export class ParametrosTelaController {
  constructor(private readonly parametrosTelaService: ParametrosTelaService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createParametrosTelaDto: CreateParametrosTelaDto) {
    return this.parametrosTelaService.create(createParametrosTelaDto);
  }

  @Get()
  findAll(@Query() filterParametrosTelaDto: FilterParametrosTelaDto) {
    return this.parametrosTelaService.findAll(filterParametrosTelaDto);
  }

  @Get('codigo/:codigo')
  findByCodigo(@Param('codigo') codigo: string) {
    return this.parametrosTelaService.findByCodigo(codigo);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.parametrosTelaService.findOne(+id);
  }

  @Get(':id/trabajos')
  getTrabajos(@Param('id') id: string) {
    return this.parametrosTelaService.getTrabajos(+id);
  }

  @Get(':id/estadisticas')
  getEstadisticas(@Param('id') id: string) {
    return this.parametrosTelaService.getEstadisticas(+id);
  }

  @Post(':id/calcular-consumo')
  calcularConsumo(@Param('id') id: string, @Body() calculoDto: CalculoConsumoDto) {
    return this.parametrosTelaService.calcularConsumo(+id, calculoDto);
  }
  /*

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateParametrosTelaDto: UpdateParametrosTelaDto) {
    return this.parametrosTelaService.update(+id, updateParametrosTelaDto);
  }
*/
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.parametrosTelaService.remove(+id);
  }
}