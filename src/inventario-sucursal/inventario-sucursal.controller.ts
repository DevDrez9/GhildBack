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
import { InventarioSucursalService } from './inventario-sucursal.service';
import { CreateInventarioSucursalDto } from './dto/create-inventario-sucursal.dto';
import { UpdateInventarioSucursalDto } from './dto/update-inventario-sucursal.dto';
import { AjusteInventarioDto } from './dto/ajuste-inventario.dto';
import { TransferenciaInventarioDto } from './dto/transferencia-inventario.dto';
import { FilterInventarioSucursalDto } from './dto/filter-inventario-sucursal.dto';

@Controller('inventario-sucursal')
export class InventarioSucursalController {
  constructor(private readonly inventarioSucursalService: InventarioSucursalService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createInventarioSucursalDto: CreateInventarioSucursalDto) {
    return this.inventarioSucursalService.create(createInventarioSucursalDto);
  }

  @Get()
  findAll(@Query() filterInventarioSucursalDto: FilterInventarioSucursalDto) {
    return this.inventarioSucursalService.findAll(filterInventarioSucursalDto);
  }
  /*

  @Get('bajo-stock')
  getProductosBajoStock(
    @Query('sucursalId') sucursalId?: string,
    @Query('tiendaId') tiendaId?: string,
    @Query('stockMinimo') stockMinimo?: string
  ) {
    return this.inventarioSucursalService.getProductosBajoStock(
      sucursalId ? +sucursalId : undefined,
      tiendaId ? +tiendaId : undefined,
      stockMinimo ? +stockMinimo : undefined
    );
  }*/

  @Get('sin-stock')
  getProductosSinStock(
    @Query('sucursalId') sucursalId?: string,
    @Query('tiendaId') tiendaId?: string
  ) {
    return this.inventarioSucursalService.getProductosSinStock(
      sucursalId ? +sucursalId : undefined,
      tiendaId ? +tiendaId : undefined
    );
  }

  @Get('estadisticas')
  getEstadisticas(
    @Query('sucursalId') sucursalId?: string,
    @Query('tiendaId') tiendaId?: string
  ) {
    return this.inventarioSucursalService.getEstadisticas(
      sucursalId ? +sucursalId : undefined,
      tiendaId ? +tiendaId : undefined
    );
  }

  @Get('producto/:productoId/sucursal/:sucursalId')
  findByProductoAndSucursal(
    @Param('productoId') productoId: string,
    @Param('sucursalId') sucursalId: string
  ) {
    return this.inventarioSucursalService.findByProductoAndSucursal(+productoId, +sucursalId);
  }
  @Get('sucursal/:sucursalId')
  findBySucursal(
    @Param('sucursalId') sucursalId: string
  ) {
    return this.inventarioSucursalService.findBySucursal( +sucursalId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inventarioSucursalService.findOne(+id);
  }

  @Get(':id/movimientos')
  getMovimientos(
    @Param('id') id: string,
    @Query('page') page: string,
    @Query('limit') limit: string
  ) {
    return this.inventarioSucursalService.getMovimientos(
      +id,
      page ? +page : 1,
      limit ? +limit : 10
    );
  }

  @Post('sincronizar-tienda')
  sincronizarConInventarioTienda(
    @Query('productoId') productoId: string,
    @Query('tiendaId') tiendaId: string
  ) {
    return this.inventarioSucursalService.sincronizarConInventarioTienda(
      +productoId,
      +tiendaId
    );
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateInventarioSucursalDto: UpdateInventarioSucursalDto) {
    return this.inventarioSucursalService.update(+id, updateInventarioSucursalDto);
  }

  @Patch(':id/ajustar-stock')
  ajustarStock(
    @Param('id') id: string,
    @Body() ajusteInventarioDto: AjusteInventarioDto,
    @Request() req
  ) {
    const usuarioId = req.user?.userId;
    return this.inventarioSucursalService.ajustarStock(+id, ajusteInventarioDto, usuarioId);
  }

  @Post('transferir/:origenId/:destinoId')
  transferirEntreSucursales(
    @Param('origenId') origenId: string,
    @Param('destinoId') destinoId: string,
    @Query('cantidad') cantidad:  Record<string, number>,
    @Query('motivo') motivo: string,
    @Request() req
  ) {
    const usuarioId = req.user?.userId;
    return this.inventarioSucursalService.transferirEntreSucursales(
      +origenId,
      +destinoId,
      cantidad,
      motivo,
      usuarioId
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.inventarioSucursalService.remove(+id);
  }
}