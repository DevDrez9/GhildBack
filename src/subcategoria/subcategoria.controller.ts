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
import { SubcategoriaService } from './subcategoria.service';
import { CreateSubcategoriaDto } from './dto/create-subcategoria.dto';
import { UpdateSubcategoriaDto } from './dto/update-subcategoria.dto';

@Controller('subcategorias')
export class SubcategoriaController {
  constructor(private readonly subcategoriaService: SubcategoriaService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createSubcategoriaDto: CreateSubcategoriaDto) {
    return this.subcategoriaService.create(createSubcategoriaDto);
  }

  @Get()
  findAll(@Query('categoriaId') categoriaId?: string) {
    return this.subcategoriaService.findAll(categoriaId ? +categoriaId : undefined);
  }

  @Get('con-productos')
  getSubcategoriasConProductos(@Query('categoriaId') categoriaId?: string) {
    return this.subcategoriaService.getSubcategoriasConProductos(categoriaId ? +categoriaId : undefined);
  }

  @Get('categoria/:categoriaId')
  findByCategoria(@Param('categoriaId') categoriaId: string) {
    return this.subcategoriaService.findByCategoria(+categoriaId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subcategoriaService.findOne(+id);
  }

  @Get(':id/estadisticas')
  getEstadisticas(@Param('id') id: string) {
    return this.subcategoriaService.getEstadisticas(+id);
  }

  @Post(':origenId/mover-productos/:destinoId')
  moverProductos(
    @Param('origenId') origenId: string,
    @Param('destinoId') destinoId: string
  ) {
    return this.subcategoriaService.moverProductos(+origenId, +destinoId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSubcategoriaDto: UpdateSubcategoriaDto) {
    return this.subcategoriaService.update(+id, updateSubcategoriaDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.subcategoriaService.remove(+id);
  }
}