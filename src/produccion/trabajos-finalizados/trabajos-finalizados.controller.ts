import {
  Controller,
  Get,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
  Post,
  Body,
} from '@nestjs/common';
import { TrabajosFinalizadosService } from './trabajos-finalizados.service';
import { UpdateCalidadDto } from './dto/update-calidad.dto';
import { FilterTrabajoFinalizadoDto } from './dto/create-trabajos-finalizado.dto';
import { TrabajoAgregadoResponseDto } from './dto/trabajo-agregado-response.dto';
import { FilterProductoTrabajoDto } from './dto/filter-trabajos-finalizados';



@Controller('trabajos-finalizados')
export class TrabajosFinalizadosController {
  constructor(private readonly trabajosFinalizadosService: TrabajosFinalizadosService) {}

  @Get()
  findAll(@Query() filterTrabajoFinalizadoDto: FilterTrabajoFinalizadoDto) {
    return this.trabajosFinalizadosService.findAll(filterTrabajoFinalizadoDto);
  }

  @Get('estadisticas')
  getEstadisticas(@Query('tiendaId') tiendaId?: string) {
    return this.trabajosFinalizadosService.getEstadisticas(tiendaId ? +tiendaId : undefined);
  }

  @Get('produccion-parametros')
  getProduccionPorParametros(@Query('tiendaId') tiendaId?: string) {
    return this.trabajosFinalizadosService.getProduccionPorParametros(tiendaId ? +tiendaId : undefined);
  }

  @Get('trabajo/:trabajoId')
  findByTrabajo(@Param('trabajoId') trabajoId: string) {
    return this.trabajosFinalizadosService.findByTrabajo(+trabajoId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.trabajosFinalizadosService.findOne(+id);
  }

  @Patch(':id/calidad')
  updateCalidad(@Param('id') id: string, @Body() updateCalidadDto: UpdateCalidadDto) {
    return this.trabajosFinalizadosService.updateCalidad(+id, updateCalidadDto);
  }

  @Post(':id/registrar-inventario')
  @HttpCode(HttpStatus.CREATED)
  registrarEnInventario(@Param('id') id: string) {
    return this.trabajosFinalizadosService.registrarEnInventario(+id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.trabajosFinalizadosService.remove(+id);
  }



  @Get('agregado/producto/:productoId')
    async getTrabajosAgregadosPorProducto(
        @Param('productoId') productoId: string,
        @Query() filter: FilterProductoTrabajoDto
    ): Promise<TrabajoAgregadoResponseDto> {
        
        const idProducto = parseInt(productoId, 10);
        
        return this.trabajosFinalizadosService.getAgregadoPorProducto(
            idProducto,
            filter.tiendaId
        );
    }
}