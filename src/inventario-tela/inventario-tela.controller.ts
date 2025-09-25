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
import { InventarioTelaService } from './inventario-tela.service';
import { CreateInventarioTelaDto } from './dto/create-inventario-tela.dto';
import { UpdateInventarioTelaDto } from './dto/update-inventario-tela.dto';
import { FilterInventarioTelaDto } from './dto/filter-inventario-tela.dto';

@Controller('inventario-telas')
export class InventarioTelaController {
  constructor(private readonly inventarioTelaService: InventarioTelaService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createInventarioTelaDto: CreateInventarioTelaDto) {
    return this.inventarioTelaService.create(createInventarioTelaDto);
  }

  @Get()
  findAll(
    @Query() filterInventarioTelaDto: FilterInventarioTelaDto,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    if (page !== undefined && limit !== undefined) {
      return this.inventarioTelaService.findAllPaginated(filterInventarioTelaDto, page, limit);
    }
    return this.inventarioTelaService.findAll(filterInventarioTelaDto);
  }

  @Get('stats')
  getStats(@Query('proveedorId') proveedorId?: string) {
    return this.inventarioTelaService.getStats(proveedorId ? +proveedorId : undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inventarioTelaService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateInventarioTelaDto: UpdateInventarioTelaDto) {
    return this.inventarioTelaService.update(+id, updateInventarioTelaDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.inventarioTelaService.remove(+id);
  }
}