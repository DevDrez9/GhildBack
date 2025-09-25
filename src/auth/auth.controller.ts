import { Controller, Post, Body, UseGuards, Get, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

import { LoginResponseDto } from './dto/login-response.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginValidationResponseDto } from './dto/login-validation-response.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}


  @UseGuards(LocalAuthGuard) // ← Usa el guard local aquí
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Request() req): Promise<LoginResponseDto> {
    // req.user viene de LocalStrategy después de la validación
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    return this.authService.getProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  async refreshToken(@Request() req) {
    return this.authService.refreshToken(req.user);
  }

   @UseGuards(LocalAuthGuard)
  @Post('validate-login')
  async validateLogin(@Body() loginDto: LoginDto, @Request() req): Promise<LoginValidationResponseDto> {
    return this.authService.validateLogin(loginDto);
  }
}