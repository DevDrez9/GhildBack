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
import { ProductoService } from './producto.service';
import { CreateProductoDto, CreateImagenProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { FilterProductoDto } from './dto/filter-producto.dto';

@Controller('productos')
export class ProductoController {
  constructor(private readonly productoService: ProductoService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createProductoDto: CreateProductoDto) {
    return this.productoService.create(createProductoDto);
  }

  @Get()
  findAll(@Query() filterProductoDto: FilterProductoDto) {
    return this.productoService.findAll(filterProductoDto);
  }

  @Get('destacados')
  getDestacados(@Query('tiendaId') tiendaId?: string) {
    return this.productoService.getProductosDestacados(tiendaId ? +tiendaId : undefined);
  }

  @Get('ofertas')
  getOfertas(@Query('tiendaId') tiendaId?: string) {
    return this.productoService.getProductosOferta(tiendaId ? +tiendaId : undefined);
  }

  @Get('nuevos')
  getNuevos(@Query('tiendaId') tiendaId?: string) {
    return this.productoService.getProductosNuevos(tiendaId ? +tiendaId : undefined);
  }

  @Get('web')
  getWeb(@Query('tiendaId') tiendaId?: string) {
    return this.productoService.getProductosWeb(tiendaId ? +tiendaId : undefined);
  }

  @Get('bajo-stock')
  getBajoStock(
    @Query('tiendaId') tiendaId?: string,
    @Query('stockMinimo') stockMinimo?: string
  ) {
    return this.productoService.getProductosBajoStock(
      tiendaId ? +tiendaId : undefined,
      stockMinimo ? +stockMinimo : 5
    );
  }

  @Get('sku/:sku')
  findBySku(@Param('sku') sku: string) {
    return this.productoService.findBySku(sku);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productoService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductoDto: UpdateProductoDto) {
    return this.productoService.update(+id, updateProductoDto);
  }

  @Patch(':id/stock/:tipo')
  updateStock(
    @Param('id') id: string,
    @Param('tipo') tipo: 'incremento' | 'decremento',
    @Query('cantidad') cantidad: string
  ) {
    return this.productoService.updateStock(+id, +cantidad, tipo);
  }

  @Post(':id/imagenes')
  addImagenes(
    @Param('id') id: string,
    @Body() imagenes: CreateImagenProductoDto[]
  ) {
    return this.productoService.addImagenes(+id, imagenes);
  }

  @Delete('imagenes/:imagenId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeImagen(@Param('imagenId') imagenId: string) {
    return this.productoService.removeImagen(+imagenId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.productoService.remove(+id);
  }
}