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
import { CarritoService } from './carrito.service';
import { CreateCarritoDto, CreateCarritoItemDto } from './dto/create-carrito.dto';
import { UpdateCarritoDto } from './dto/update-carrito.dto';
import { UpdateEstadoCarritoDto } from './dto/update-estado-carrito.dto';
import { FilterCarritoDto } from './dto/filter-carrito.dto';

@Controller('carritos')
export class CarritoController {
  constructor(private readonly carritoService: CarritoService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createCarritoDto: CreateCarritoDto) {
    return this.carritoService.create(createCarritoDto);
  }

  @Get()
  findAll(@Query() filterCarritoDto: FilterCarritoDto) {
    return this.carritoService.findAll(filterCarritoDto);
  }

  @Get('cliente/:cliente')
  findByCliente(
    @Param('cliente') cliente: string,
    @Query('tiendaId') tiendaId?: string
  ) {
    return this.carritoService.findByCliente(cliente, tiendaId ? +tiendaId : undefined);
  }

  @Get('estadisticas')
  getEstadisticas(@Query('tiendaId') tiendaId?: string) {
    return this.carritoService.getEstadisticas(tiendaId ? +tiendaId : undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.carritoService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCarritoDto: UpdateCarritoDto) {
    return this.carritoService.update(+id, updateCarritoDto);
  }

  @Patch(':id/estado')
  updateEstado(@Param('id') id: string, @Body() updateEstadoCarritoDto: UpdateEstadoCarritoDto) {
    return this.carritoService.updateEstado(+id, updateEstadoCarritoDto);
  }

  @Post(':id/items')
  addItem(@Param('id') id: string, @Body() createItemDto: CreateCarritoItemDto) {
    return this.carritoService.addItem(+id, createItemDto);
  }

  @Patch('items/:itemId')
  updateItem(@Param('itemId') itemId: string, @Query('cantidad') cantidad: string) {
    return this.carritoService.updateItem(+itemId, +cantidad);
  }

  @Delete('items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeItem(@Param('itemId') itemId: string) {
    return this.carritoService.removeItem(+itemId);
  }

  @Post(':id/convertir-venta')
  convertToVenta(@Param('id') id: string) {
    return this.carritoService.convertToVenta(+id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.carritoService.remove(+id);
  }
}