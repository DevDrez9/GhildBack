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
import { CategoriaService } from './categoria.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';

@Controller('categorias')
export class CategoriaController {
  constructor(private readonly categoriaService: CategoriaService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createCategoriaDto: CreateCategoriaDto) {
    return this.categoriaService.create(createCategoriaDto);
  }

  @Get()
  findAll(@Query('tiendaId') tiendaId?: string) {
    return this.categoriaService.findAll(tiendaId ? +tiendaId : undefined);
  }

  @Get('con-productos')
  getCategoriasConProductos(@Query('tiendaId') tiendaId?: string) {
    return this.categoriaService.getCategoriasConProductos(tiendaId ? +tiendaId : undefined);
  }

  @Get('tienda/:tiendaId')
  findByTienda(@Param('tiendaId') tiendaId: string) {
    return this.categoriaService.findByTienda(+tiendaId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriaService.findOne(+id);
  }

  @Get(':id/estadisticas')
  getEstadisticas(@Param('id') id: string) {
    return this.categoriaService.getEstadisticas(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCategoriaDto: UpdateCategoriaDto) {
    return this.categoriaService.update(+id, updateCategoriaDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.categoriaService.remove(+id);
  }
}