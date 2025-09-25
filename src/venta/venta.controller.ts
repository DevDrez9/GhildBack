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
import { VentaService } from './venta.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { UpdateVentaDto } from './dto/update-venta.dto';
import { UpdateEstadoVentaDto } from './dto/update-estado-venta.dto';
import { FilterVentaDto } from './dto/filter-venta.dto';

@Controller('ventas')
export class VentaController {
  constructor(private readonly ventaService: VentaService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createVentaDto: CreateVentaDto) {
    return this.ventaService.create(createVentaDto);
  }

  @Get()
  findAll(@Query() filterVentaDto: FilterVentaDto) {
    return this.ventaService.findAll(filterVentaDto);
  }

  @Get('estadisticas')
  getEstadisticas(
    @Query('tiendaId') tiendaId?: string,
    @Query('sucursalId') sucursalId?: string
  ) {
    return this.ventaService.getEstadisticas(
      tiendaId ? +tiendaId : undefined,
      sucursalId ? +sucursalId : undefined
    );
  }

  @Get('periodo/:periodo')
  getVentasPorPeriodo(
    @Param('periodo') periodo: 'dia' | 'semana' | 'mes',
    @Query('tiendaId') tiendaId?: string,
    @Query('sucursalId') sucursalId?: string
  ) {
    return this.ventaService.getVentasPorPeriodo(
      periodo,
      tiendaId ? +tiendaId : undefined,
      sucursalId ? +sucursalId : undefined
    );
  }

  @Get('numero/:numeroVenta')
  findByNumeroVenta(@Param('numeroVenta') numeroVenta: string) {
    return this.ventaService.findByNumeroVenta(numeroVenta);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ventaService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateVentaDto: UpdateVentaDto) {
    return this.ventaService.update(+id, updateVentaDto);
  }

  @Patch(':id/estado')
  updateEstado(@Param('id') id: string, @Body() updateEstadoVentaDto: UpdateEstadoVentaDto) {
    return this.ventaService.updateEstado(+id, updateEstadoVentaDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.ventaService.remove(+id);
  }
}