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
import { ProveedorService } from './proveedor.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { ProveedorTiendaDto } from './dto/proveedor-tienda.dto';
import { FilterProveedorDto } from './dto/filter-proveedor.dto';

@Controller('proveedores')
export class ProveedorController {
  constructor(private readonly proveedorService: ProveedorService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createProveedorDto: CreateProveedorDto) {
    return this.proveedorService.create(createProveedorDto);
  }

  @Get()
  findAll(@Query() filterProveedorDto: FilterProveedorDto) {
    return this.proveedorService.findAll(filterProveedorDto);
  }
  @Get('Minimo')
  findAllMinimo(@Query() filterProveedorDto: FilterProveedorDto) {
    return this.proveedorService.findAllMinimo(filterProveedorDto);
  }

  @Get('tienda/:tiendaId')
  getProveedoresByTienda(@Param('tiendaId') tiendaId: string) {
    return this.proveedorService.getProveedoresByTienda(+tiendaId);
  }
/*
  @Get('ruc/:ruc')
  findByRuc(@Param('ruc') ruc: string) {
    return this.proveedorService.findByRuc(ruc);
  }
*/
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.proveedorService.findOne(+id);
  }

  @Get(':id/tiendas')
  getTiendasByProveedor(@Param('id') id: string) {
    return this.proveedorService.getTiendasByProveedor(+id);
  }

  @Get(':id/productos')
  getProductosByProveedor(@Param('id') id: string) {
    return this.proveedorService.getProductosByProveedor(+id);
  }

  @Get(':id/estadisticas')
  getEstadisticas(@Param('id') id: string) {
    return this.proveedorService.getEstadisticas(+id);
  }

  @Post('tiendas')
  @HttpCode(HttpStatus.CREATED)
  addTienda(@Body() proveedorTiendaDto: ProveedorTiendaDto) {
    return this.proveedorService.addTiendaToProveedor(proveedorTiendaDto);
  }

  @Delete(':proveedorId/tiendas/:tiendaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTienda(
    @Param('proveedorId') proveedorId: string,
    @Param('tiendaId') tiendaId: string,
  ) {
    return this.proveedorService.removeTiendaFromProveedor(+proveedorId, +tiendaId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProveedorDto: UpdateProveedorDto) {
    return this.proveedorService.update(+id, updateProveedorDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.proveedorService.remove(+id);
  }
}