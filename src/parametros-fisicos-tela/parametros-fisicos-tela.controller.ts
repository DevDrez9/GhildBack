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
import { ParametrosFisicosTelaService } from './parametros-fisicos-tela.service';
import { CreateParametrosFisicosTelaDto } from './dto/create-parametros-fisicos-tela.dto';
import { UpdateParametrosFisicosTelaDto } from './dto/update-parametros-fisicos-tela.dto';

@Controller('parametros-fisicos-tela')
export class ParametrosFisicosTelaController {
  constructor(private readonly parametrosFisicosTelaService: ParametrosFisicosTelaService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: CreateParametrosFisicosTelaDto) {
    return this.parametrosFisicosTelaService.create(createDto);
  }

  @Get()
  findAll() {
    return this.parametrosFisicosTelaService.findAll();
  }

 
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.parametrosFisicosTelaService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateParametrosFisicosTelaDto) {
    return this.parametrosFisicosTelaService.update(+id, updateDto);
  }

   @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.parametrosFisicosTelaService.deleteParametro(+id);
  }

  
}