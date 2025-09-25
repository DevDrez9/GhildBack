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
  Request,
} from '@nestjs/common';
import { InventarioTiendaService } from './inventario-tienda.service';
import { CreateInventarioTiendaDto } from './dto/create-inventario-tienda.dto';
import { UpdateInventarioTiendaDto } from './dto/update-inventario-tienda.dto';
import { AjusteInventarioDto } from './dto/ajuste-inventario.dto';
import { FilterInventarioTiendaDto } from './dto/filter-inventario-tienda.dto';

@Controller('inventario-tienda')
export class InventarioTiendaController {
  constructor(private readonly inventarioTiendaService: InventarioTiendaService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createInventarioTiendaDto: CreateInventarioTiendaDto) {
    return this.inventarioTiendaService.create(createInventarioTiendaDto);
  }

  @Get()
  findAll(@Query() filterInventarioTiendaDto: FilterInventarioTiendaDto) {
    return this.inventarioTiendaService.findAll(filterInventarioTiendaDto);
  }

  @Get('bajo-stock')
  getProductosBajoStock(
    @Query('tiendaId') tiendaId?: string,
    @Query('stockMinimo') stockMinimo?: string
  ) {
    return this.inventarioTiendaService.getProductosBajoStock(
      tiendaId ? +tiendaId : undefined,
      stockMinimo ? +stockMinimo : undefined
    );
  }

  @Get('sin-stock')
  getProductosSinStock(@Query('tiendaId') tiendaId?: string) {
    return this.inventarioTiendaService.getProductosSinStock(
      tiendaId ? +tiendaId : undefined
    );
  }

  @Get('estadisticas')
  getEstadisticas(@Query('tiendaId') tiendaId?: string) {
    return this.inventarioTiendaService.getEstadisticas(
      tiendaId ? +tiendaId : undefined
    );
  }

  @Get('producto/:productoId/tienda/:tiendaId')
  findByProductoAndTienda(
    @Param('productoId') productoId: string,
    @Param('tiendaId') tiendaId: string
  ) {
    return this.inventarioTiendaService.findByProductoAndTienda(+productoId, +tiendaId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inventarioTiendaService.findOne(+id);
  }

  @Get(':id/movimientos')
  getMovimientos(
    @Param('id') id: string,
    @Query('page') page: string,
    @Query('limit') limit: string
  ) {
    return this.inventarioTiendaService.getMovimientos(
      +id,
      page ? +page : 1,
      limit ? +limit : 10
    );
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateInventarioTiendaDto: UpdateInventarioTiendaDto) {
    return this.inventarioTiendaService.update(+id, updateInventarioTiendaDto);
  }

  @Patch(':id/ajustar-stock')
  ajustarStock(
    @Param('id') id: string,
    @Body() ajusteInventarioDto: AjusteInventarioDto,
    @Request() req
  ) {
    const usuarioId = req.user?.userId;
    return this.inventarioTiendaService.ajustarStock(+id, ajusteInventarioDto, usuarioId);
  }

  @Post('transferir/:origenId/:destinoId')
  transferirStock(
    @Param('origenId') origenId: string,
    @Param('destinoId') destinoId: string,
    @Query('cantidad') cantidad: string,
    @Query('motivo') motivo: string,
    @Request() req
  ) {
    const usuarioId = req.user?.userId;
    return this.inventarioTiendaService.transferirStock(
      +origenId,
      +destinoId,
      +cantidad,
      motivo,
      usuarioId
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.inventarioTiendaService.remove(+id);
  }
}