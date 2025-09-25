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
import { TiendaService } from './tienda.service';
import { CreateTiendaDto } from './dto/create-tienda.dto';
import { UpdateTiendaDto } from './dto/update-tienda.dto';

@Controller('tiendas')
export class TiendaController {
  constructor(private readonly tiendaService: TiendaService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createTiendaDto: CreateTiendaDto) {
    return this.tiendaService.create(createTiendaDto);
  }

  @Get()
  findAll() {
    return this.tiendaService.findAll();
  }

  @Get('principal')
  getTiendaPrincipal() {
    return this.tiendaService.getTiendaPrincipal();
  }

  @Get('dominio/:dominio')
  findByDominio(@Param('dominio') dominio: string) {
    return this.tiendaService.findByDominio(dominio);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tiendaService.findOne(+id);
  }

  @Get(':id/estadisticas')
  getEstadisticas(@Param('id') id: string) {
    return this.tiendaService.getEstadisticas(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTiendaDto: UpdateTiendaDto) {
    return this.tiendaService.update(+id, updateTiendaDto);
  }

  @Patch(':id/principal')
  setTiendaPrincipal(@Param('id') id: string) {
    return this.tiendaService.setTiendaPrincipal(+id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.tiendaService.remove(+id);
  }
}