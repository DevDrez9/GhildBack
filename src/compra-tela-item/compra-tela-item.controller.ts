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
import { CompraTelaItemService } from './compra-tela-item.service';
import { CreateCompraTelaItemDto } from './dto/create-compra-tela-item.dto';
import { UpdateCompraTelaItemDto } from './dto/update-compra-tela-item.dto';

@Controller('compra-tela-items')
export class CompraTelaItemController {
  constructor(private readonly compraTelaItemService: CompraTelaItemService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createCompraTelaItemDto: CreateCompraTelaItemDto) {
    return this.compraTelaItemService.create(createCompraTelaItemDto);
  }

  @Get()
  findAll(
    @Query('compraId') compraId?: string,
    @Query('telaId') telaId?: string
  ) {
    return this.compraTelaItemService.findAll(
      compraId ? +compraId : undefined,
      telaId ? +telaId : undefined
    );
  }

  @Get('compra/:compraId')
  findByCompra(@Param('compraId') compraId: string) {
    return this.compraTelaItemService.findByCompra(+compraId);
  }

  @Get('tela/:telaId')
  findByTela(@Param('telaId') telaId: string) {
    return this.compraTelaItemService.findByTela(+telaId);
  }

  @Get('tela/:telaId/estadisticas')
  getEstadisticasPorTela(@Param('telaId') telaId: string) {
    return this.compraTelaItemService.getEstadisticasPorTela(+telaId);
  }

  @Get('resumen')
  getResumenCompras(
    @Query('proveedorId') proveedorId?: string,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string
  ) {
    return this.compraTelaItemService.getResumenCompras(
      proveedorId ? +proveedorId : undefined,
      fechaInicio ? new Date(fechaInicio) : undefined,
      fechaFin ? new Date(fechaFin) : undefined
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.compraTelaItemService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCompraTelaItemDto: UpdateCompraTelaItemDto
  ) {
    return this.compraTelaItemService.update(+id, updateCompraTelaItemDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.compraTelaItemService.remove(+id);
  }
}