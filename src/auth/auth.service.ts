import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { PrismaService } from 'src/prisma.service';
import * as bcrypt from 'bcryptjs'; 
import { LoginValidationResponseDto } from './dto/login-validation-response.dto';


@Injectable()
export class AuthService {
 constructor(
    private prisma: PrismaService,
    private jwtService: JwtService, // ← Debe estar aquí
  ) {
    console.log('JwtService injected:', !!this.jwtService); // ← Debug
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.usuario.findUnique({
      where: { email },
      include: {
        tiendas: {
          include: {
            tienda: true
          }
        },
        sucursales: {
          include: {
            sucursal: {
              include: {
                tienda: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    if (!user.activo) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }

    const { password: _, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    const payload = { 
      email: user.email, 
      sub: user.id,
      rol: user.rol
    };

    const accessToken = this.jwtService.sign(payload);

    return new LoginResponseDto(accessToken, user);
  }

  async getProfile(userId: number) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        rol: true,
        activo: true,
        createdAt: true,
        tiendas: {
          include: {
            tienda: true
          }
        },
        sucursales: {
          include: {
            sucursal: {
              include: {
                tienda: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return user;
  }

  async refreshToken(user: any) {
    const payload = { 
      email: user.email, 
      sub: user.userId,
      rol: user.rol
    };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }

   async validateLogin(loginDto: LoginDto): Promise<LoginValidationResponseDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    // Retorna solo los datos del usuario sin token
    return new LoginValidationResponseDto({
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      apellido: user.apellido,
      rol: user.rol,
      activo: user.activo,
      tiendas: user.tiendas,
      sucursales: user.sucursales,
      createdAt: user.createdAt
    });
  }
}