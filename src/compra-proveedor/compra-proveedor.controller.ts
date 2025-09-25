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
import { CompraProveedorService } from './compra-proveedor.service';
import { CreateCompraProveedorDto } from './dto/create-compra-proveedor.dto';
import { UpdateCompraProveedorDto } from './dto/update-compra-proveedor.dto';
import { UpdateEstadoCompraDto } from './dto/update-estado-compra.dto';
import { FilterCompraProveedorDto } from './dto/filter-compra-proveedor.dto';

@Controller('compras-proveedor')
export class CompraProveedorController {
  constructor(private readonly compraProveedorService: CompraProveedorService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createCompraProveedorDto: CreateCompraProveedorDto) {
    return this.compraProveedorService.create(createCompraProveedorDto);
  }

  @Get()
  findAll(@Query() filterCompraProveedorDto: FilterCompraProveedorDto) {
    return this.compraProveedorService.findAll(filterCompraProveedorDto);
  }

  @Get('estadisticas')
  getEstadisticas(@Query('proveedorId') proveedorId?: string) {
    return this.compraProveedorService.getEstadisticas(proveedorId ? +proveedorId : undefined);
  }

  @Get('proveedor/:proveedorId')
  getComprasPorProveedor(@Param('proveedorId') proveedorId: string) {
    return this.compraProveedorService.getComprasPorProveedor(+proveedorId);
  }

  @Get('numero/:numeroCompra')
  findByNumeroCompra(@Param('numeroCompra') numeroCompra: string) {
    return this.compraProveedorService.findByNumeroCompra(numeroCompra);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.compraProveedorService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCompraProveedorDto: UpdateCompraProveedorDto) {
    return this.compraProveedorService.update(+id, updateCompraProveedorDto);
  }

  @Patch(':id/estado')
  updateEstado(@Param('id') id: string, @Body() updateEstadoCompraDto: UpdateEstadoCompraDto) {
    return this.compraProveedorService.updateEstado(+id, updateEstadoCompraDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.compraProveedorService.remove(+id);
  }
}