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
import { SucursalService } from './sucursal.service';
import { CreateSucursalDto } from './dto/create-sucursal.dto';
import { UpdateSucursalDto } from './dto/update-sucursal.dto';

@Controller('sucursales')
export class SucursalController {
  constructor(private readonly sucursalService: SucursalService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createSucursalDto: CreateSucursalDto) {
    return this.sucursalService.create(createSucursalDto);
  }

  @Get()
  findAll() {
    return this.sucursalService.findAll();
  }

  @Get('tienda/:tiendaId')
  findByTienda(@Param('tiendaId') tiendaId: string) {
    return this.sucursalService.findByTienda(+tiendaId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sucursalService.findOne(+id);
  }

  @Get(':id/estadisticas')
  getEstadisticas(@Param('id') id: string) {
    return this.sucursalService.getEstadisticas(+id);
  }

  @Get(':id/inventario')
  getInventario(@Param('id') id: string) {
    return this.sucursalService.getInventario(+id);
  }

  @Get(':id/inventario/bajo-stock')
  getProductosBajoStock(
    @Param('id') id: string,
    @Query('stockMinimo') stockMinimo: string
  ) {
    return this.sucursalService.getProductosBajoStock(
      +id, 
      stockMinimo ? +stockMinimo : 5
    );
  }

  @Post(':origenId/transferir/:destinoId/producto/:productoId')
  transferirProducto(
    @Param('origenId') origenId: string,
    @Param('destinoId') destinoId: string,
    @Param('productoId') productoId: string,
    @Query('cantidad') cantidad: Record<string, number> 
  ) {
    return this.sucursalService.transferirProducto(
      +origenId,
      +destinoId,
      +productoId,
      cantidad
    );
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSucursalDto: UpdateSucursalDto) {
    return this.sucursalService.update(+id, updateSucursalDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.sucursalService.remove(+id);
  }
}