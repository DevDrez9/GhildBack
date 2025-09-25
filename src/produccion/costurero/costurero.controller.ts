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

import { CreateCostureroDto } from './dto/create-costurero.dto';
import { UpdateCostureroDto } from './dto/update-costurero.dto';
import { UpdateEstadoCostureroDto } from './dto/update-estado-costurero.dto';
import { FilterCostureroDto } from './dto/filter-costurero.dto';
import { CostureroService } from './costurero.service';

@Controller('costureros')
export class CostureroController {
  
  constructor(private readonly costurerosService: CostureroService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createCostureroDto: CreateCostureroDto) {
    return this.costurerosService.create(createCostureroDto);
  }

  @Get()
  findAll(@Query() filterCostureroDto: FilterCostureroDto) {
    return this.costurerosService.findAll(filterCostureroDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.costurerosService.findOne(+id);
  }

  @Get(':id/trabajos')
  getTrabajos(@Param('id') id: string, @Query() filters: any) {
    return this.costurerosService.getTrabajos(+id, filters);
  }

  @Get(':id/estadisticas')
  getEstadisticas(@Param('id') id: string) {
    return this.costurerosService.getEstadisticas(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCostureroDto: UpdateCostureroDto) {
    return this.costurerosService.update(+id, updateCostureroDto);
  }

  @Patch(':id/estado')
  updateEstado(@Param('id') id: string, @Body() updateEstadoDto: UpdateEstadoCostureroDto) {
    return this.costurerosService.updateEstado(+id, updateEstadoDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.costurerosService.remove(+id);
  }
}