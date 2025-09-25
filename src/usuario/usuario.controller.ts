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
import { UsuarioService } from './usuario.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { UsuarioTiendaDto } from './dto/usuario-tienda.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Rol } from 'generated/prisma/client';
import { UsuarioSucursalDto } from './dto/usuario-sucursal.dto';


@Controller('usuarios')
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuarioService.create(createUsuarioDto);
  }

  @Get()
  findAll() {
    return this.usuarioService.findAll();
  }

  @Get('rol/:rol')
  findByRol(@Param('rol') rol: Rol) {
    return this.usuarioService.getUsuariosByRol(rol);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usuarioService.findOne(+id);
  }

  @Get('email/:email')
  findByEmail(@Param('email') email: string) {
    return this.usuarioService.findByEmail(email);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUsuarioDto: UpdateUsuarioDto) {
    return this.usuarioService.update(+id, updateUsuarioDto);
  }

  @Patch(':id/password')
  changePassword(@Param('id') id: string, @Body() changePasswordDto: ChangePasswordDto) {
    return this.usuarioService.changePassword(+id, changePasswordDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.usuarioService.remove(+id);
  }

  // Endpoints para gestión de tiendas de usuario
  @Post(':id/tiendas')
  @HttpCode(HttpStatus.CREATED)
  addTienda(@Param('id') usuarioId: string, @Body() usuarioTiendaDto: UsuarioTiendaDto) {
    return this.usuarioService.addTiendaToUsuario(usuarioTiendaDto);
  }

  @Get(':id/tiendas')
  getTiendas(@Param('id') usuarioId: string) {
    return this.usuarioService.getTiendasByUsuario(+usuarioId);
  }

  @Delete(':usuarioId/tiendas/:tiendaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTienda(
    @Param('usuarioId') usuarioId: string,
    @Param('tiendaId') tiendaId: string,
  ) {
    return this.usuarioService.removeTiendaFromUsuario(+usuarioId, +tiendaId);
  }

  @Post(':id/sucursales')
  @HttpCode(HttpStatus.CREATED)
  addSucursal(
    @Param('id') usuarioId: string, 
    @Body() usuarioSucursalDto: UsuarioSucursalDto
  ) {
    return this.usuarioService.addSucursalToUsuario(usuarioSucursalDto);
  }

  @Get(':id/sucursales')
  getSucursales(@Param('id') usuarioId: string) {
    return this.usuarioService.getSucursalesByUsuario(+usuarioId);
  }

  @Get('sucursal/:sucursalId/usuarios')
  getUsuariosBySucursal(@Param('sucursalId') sucursalId: string) {
    return this.usuarioService.getUsuariosBySucursal(+sucursalId);
  }

  @Delete(':usuarioId/sucursales/:sucursalId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeSucursal(
    @Param('usuarioId') usuarioId: string,
    @Param('sucursalId') sucursalId: string,
  ) {
    return this.usuarioService.removeSucursalFromUsuario(+usuarioId, +sucursalId);
  }
}