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
import { TelaService } from './tela.service';
import { CreateTelaDto } from './dto/create-tela.dto';
import { UpdateTelaDto } from './dto/update-tela.dto';
import { ParametrosFisicosTelaDto } from './dto/parametros-fisicos.dto';
import { CreateInventarioTelaDto } from './dto/inventario-tela.dto';
import { FilterTelaDto } from './dto/filter-tela.dto';


@Controller('telas')
export class TelaController {
  constructor(private readonly telaService: TelaService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createTelaDto: CreateTelaDto) {
    return this.telaService.create(createTelaDto);
  }

  @Get()
  findAll(@Query() filterTelaDto: FilterTelaDto) {
    return this.telaService.findAll(filterTelaDto);
  }

 

  @Get('buscar/:caracteristicas')
  searchByCaracteristicas(@Param('caracteristicas') caracteristicas: string) {
    return this.telaService.searchTelasByCaracteristicas(caracteristicas);
  }

  @Get('inventario')
  getInventario(
    @Query('telaId') telaId?: string,
    @Query('proveedorId') proveedorId?: string
  ) {
    return this.telaService.getInventarioTela(
      telaId ? +telaId : undefined,
      proveedorId ? +proveedorId : undefined
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.telaService.findOne(+id);
  }

  @Get(':id/estadisticas')
  getEstadisticas(@Param('id') id: string) {
    return this.telaService.getEstadisticas(+id);
  }

 
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTelaDto: UpdateTelaDto) {
    return this.telaService.update(+id, updateTelaDto);
  }

 

   @Patch(':id/parametro-fisico/:parametroId')
  assignParametroFisico(
    @Param('id') id: string,
    @Param('parametroId') parametroId: string
  ) {
    return this.telaService.assignParametroFisico(+id, +parametroId);
  }

  @Delete(':id/parametro-fisico')
  @HttpCode(HttpStatus.NO_CONTENT)
  unassignParametroFisico(@Param('id') id: string) {
    return this.telaService.unassignParametroFisico(+id);
  }
  @Delete(':id')
  eliminarTela(@Param('id') id: string) {
    return this.telaService.deleteTela(+id);
  }

  @Get('parametro-fisico/:parametroId')
  getTelasByParametroFisico(@Param('parametroId') parametroId: string) {
    return this.telaService.getTelasByParametroFisico(+parametroId);
  }
  

  
  


}