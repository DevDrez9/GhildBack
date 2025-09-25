import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { UsuarioTiendaDto } from './dto/usuario-tienda.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma.service';
import { Prisma, Rol } from 'generated/prisma';
import { UsuarioSucursalDto } from './dto/usuario-sucursal.dto';

@Injectable()
export class UsuarioService {
  constructor(private readonly prisma: PrismaService) {}

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  async create(createUsuarioDto: CreateUsuarioDto) {
    const { password, ...userData } = createUsuarioDto;

    // Verificar si el email ya existe
    const existingUser = await this.prisma.usuario.findUnique({
      where: { email: userData.email }
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    const hashedPassword = await this.hashPassword(password);

    return this.prisma.usuario.create({
      data: {
        ...userData,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        rol: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
        tiendas: {
          include: {
            tienda: true
          }
        }
      }
    });
  }

  async findAll() {
    return this.prisma.usuario.findMany({
      where: { activo: true },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        rol: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
        tiendas: {
          include: {
            tienda: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

async findOne(id: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        rol: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
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

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return usuario;
  }


  async findByEmail(email: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
      include: {
        tiendas: {
          include: {
            tienda: true
          }
        }
      }
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario con email ${email} no encontrado`);
    }

    return usuario;
  }

  async update(id: number, updateUsuarioDto: UpdateUsuarioDto) {
    await this.findOne(id); // Verificar que existe

    const { password, ...userData } = updateUsuarioDto;

    const data: Prisma.UsuarioUpdateInput = { ...userData };

    if (password) {
      data.password = await this.hashPassword(password);
    }

    return this.prisma.usuario.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        rol: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
        tiendas: {
          include: {
            tienda: true
          }
        }
      }
    });
  }

  async remove(id: number) {
    await this.findOne(id); // Verificar que existe

    // En lugar de eliminar, marcamos como inactivo
    return this.prisma.usuario.update({
      where: { id },
      data: { activo: false },
      select: {
        id: true,
        email: true,
        activo: true
      }
    });
  }

  async addTiendaToUsuario(usuarioTiendaDto: UsuarioTiendaDto) {
    const { usuarioId, tiendaId } = usuarioTiendaDto;

    // Verificar que el usuario existe
    await this.findOne(usuarioId);

    // Verificar que la tienda existe
    const tienda = await this.prisma.tienda.findUnique({
      where: { id: tiendaId }
    });

    if (!tienda) {
      throw new NotFoundException(`Tienda con ID ${tiendaId} no encontrada`);
    }

    try {
      return await this.prisma.usuarioTienda.create({
        data: {
          usuarioId,
          tiendaId
        },
        include: {
          usuario: {
            select: {
              id: true,
              email: true,
              nombre: true
            }
          },
          tienda: {
            select: {
              id: true,
              nombre: true,
              dominio: true
            }
          }
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('El usuario ya tiene acceso a esta tienda');
        }
      }
      throw error;
    }
  }

  async removeTiendaFromUsuario(usuarioId: number, tiendaId: number) {
    const usuarioTienda = await this.prisma.usuarioTienda.findUnique({
      where: {
        usuarioId_tiendaId: {
          usuarioId,
          tiendaId
        }
      }
    });

    if (!usuarioTienda) {
      throw new NotFoundException('La relación usuario-tienda no existe');
    }

    return this.prisma.usuarioTienda.delete({
      where: {
        usuarioId_tiendaId: {
          usuarioId,
          tiendaId
        }
      }
    });
  }

  async getTiendasByUsuario(usuarioId: number) {
    await this.findOne(usuarioId); // Verificar que el usuario existe

    return this.prisma.usuarioTienda.findMany({
      where: { usuarioId },
      include: {
        tienda: true
      }
    });
  }

  async changePassword(id: number, changePasswordDto: ChangePasswordDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id }
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    // Verificar la contraseña actual
    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      usuario.password
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }

    // Hashear la nueva contraseña
    const hashedNewPassword = await this.hashPassword(changePasswordDto.newPassword);

    return this.prisma.usuario.update({
      where: { id },
      data: { password: hashedNewPassword },
      select: {
        id: true,
        email: true,
        updatedAt: true
      }
    });
  }

  async getUsuariosByRol(rol: Rol) {
    return this.prisma.usuario.findMany({
      where: { 
        rol,
        activo: true 
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        rol: true,
        createdAt: true
      },
      orderBy: { nombre: 'asc' }
    });
  }

  async addSucursalToUsuario(usuarioSucursalDto: UsuarioSucursalDto) {
    const { usuarioId, sucursalId } = usuarioSucursalDto;

    // Verificar que el usuario existe
    await this.findOne(usuarioId);

    // Verificar que la sucursal existe
    const sucursal = await this.prisma.sucursal.findUnique({
      where: { id: sucursalId },
      include: { tienda: true }
    });

    if (!sucursal) {
      throw new NotFoundException(`Sucursal con ID ${sucursalId} no encontrada`);
    }

    try {
      return await this.prisma.usuarioSucursal.create({
        data: {
          usuarioId,
          sucursalId
        },
        include: {
          usuario: {
            select: {
              id: true,
              email: true,
              nombre: true
            }
          },
          sucursal: {
            include: {
              tienda: true
            }
          }
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('El usuario ya tiene acceso a esta sucursal');
        }
      }
      throw error;
    }
  }

  async removeSucursalFromUsuario(usuarioId: number, sucursalId: number) {
    const usuarioSucursal = await this.prisma.usuarioSucursal.findUnique({
      where: {
        usuarioId_sucursalId: {
          usuarioId,
          sucursalId
        }
      }
    });

    if (!usuarioSucursal) {
      throw new NotFoundException('La relación usuario-sucursal no existe');
    }

    return this.prisma.usuarioSucursal.delete({
      where: {
        usuarioId_sucursalId: {
          usuarioId,
          sucursalId
        }
      }
    });
  }

  async getSucursalesByUsuario(usuarioId: number) {
    await this.findOne(usuarioId); // Verificar que el usuario existe

    return this.prisma.usuarioSucursal.findMany({
      where: { usuarioId },
      include: {
        sucursal: {
          include: {
            tienda: true
          }
        }
      }
    });
  }

  async getUsuariosBySucursal(sucursalId: number) {
    // Verificar que la sucursal existe
    const sucursal = await this.prisma.sucursal.findUnique({
      where: { id: sucursalId }
    });

    if (!sucursal) {
      throw new NotFoundException(`Sucursal con ID ${sucursalId} no encontrada`);
    }

    return this.prisma.usuarioSucursal.findMany({
      where: { sucursalId },
      include: {
        usuario: {
          select: {
            id: true,
            email: true,
            nombre: true,
            apellido: true,
            rol: true
          }
        }
      }
    });
  }
}