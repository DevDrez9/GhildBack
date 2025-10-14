import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';

import { CreateTelaDto } from './dto/create-tela.dto';
import { UpdateTelaDto } from './dto/update-tela.dto';
import { ParametrosFisicosTelaDto } from './dto/parametros-fisicos.dto';
import { CreateInventarioTelaDto } from './dto/inventario-tela.dto';
import { TelaResponseDto, ParametrosFisicosResponseDto } from './dto/tela-response.dto';
import { FilterTelaDto } from './dto/filter-tela.dto';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from 'generated/prisma/client';

@Injectable()
export class TelaService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createTelaDto: CreateTelaDto): Promise<TelaResponseDto> {
    const { proveedorId, parametrosFisicosId, ...telaData } = createTelaDto;

    // Verificar que el proveedor existe SOLO si se proporciona
    if (proveedorId) {
      const proveedor = await this.prisma.proveedor.findUnique({
        where: { id: proveedorId }
      });

      if (!proveedor) {
        throw new NotFoundException(`Proveedor con ID ${proveedorId} no encontrado`);
      }
    }

    // Verificar que los parámetros físicos existen SOLO si se proporcionan
    if (parametrosFisicosId) {
      const parametros = await this.prisma.parametrosFisicosTela.findUnique({
        where: { id: parametrosFisicosId }
      });

      if (!parametros) {
        throw new NotFoundException(`Parámetros físicos con ID ${parametrosFisicosId} no encontrados`);
      }
    }

    const telaDataCompleto = {
      ...telaData,
      estado: telaData.estado || 'ACTIVA',
      rendimiento: telaData.rendimiento || 0,
      acabado: telaData.acabado || '',
      nota: telaData.nota || ''
    };

    try {
      const data: Prisma.TelaCreateInput = {
        ...telaDataCompleto
      };

      // Conectar proveedor solo si se proporciona
      if (proveedorId) {
        data.proveedor = { connect: { id: proveedorId } };
      }

      // Conectar parámetros físicos solo si se proporcionan
      if (parametrosFisicosId) {
        data.parametrosFisicos = { connect: { id: parametrosFisicosId } };
      }

      const tela = await this.prisma.tela.create({
        data,
        include: {
          proveedor: true,
          parametrosFisicos: true,
          inventarioTelas: {
            take: 5,
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      return new TelaResponseDto(tela);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Error al crear la tela');
        }
      }
      throw error;
    }
  }

  async findAll(filterTelaDto: FilterTelaDto = {}): Promise<TelaResponseDto[]> {
    const { tipoTela, composicion, color, proveedorId, estado, search, parametrosFisicosId, conParametrosFisicos } = filterTelaDto;

    const where: Prisma.TelaWhereInput = {};

    if (tipoTela) where.tipoTela = { contains: tipoTela };
    if (composicion) where.composicion = { contains: composicion };
    if (color) where.colores = { contains: color };
    if (proveedorId) where.proveedorId = proveedorId;
    if (estado) where.estado = estado;

    // Filtrar por parámetros físicos específicos
    if (parametrosFisicosId) {
      where.parametrosFisicosId = parametrosFisicosId;
    }

    // Filtrar por telas con/sin parámetros físicos
    if (conParametrosFisicos !== undefined) {
      if (conParametrosFisicos) {
        where.parametrosFisicosId = { not: null };
      } else {
        where.parametrosFisicosId = null;
      }
    }

    if (search) {
      where.OR = [
        { nombreComercial: { contains: search, mode: 'insensitive' } },
        { tipoTela: { contains: search, mode: 'insensitive' } },
        { composicion: { contains: search, mode: 'insensitive' } },
        { colores: { contains: search } }
      ] as Prisma.TelaWhereInput['OR'];
    }

    const telas = await this.prisma.tela.findMany({
      where,
      include: {
        proveedor: {
          select: {
            id: true,
            nombre: true,
            contacto: true
          }
        },
        parametrosFisicos: true,
        inventarioTelas: {
          take: 3,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { nombreComercial: 'asc' }
    });

    return telas.map(tela => new TelaResponseDto(tela));
  }

  async findOne(id: number): Promise<TelaResponseDto> {
    const tela = await this.prisma.tela.findUnique({
      where: { id },
      include: {
        proveedor: true,
        parametrosFisicos: true,
        inventarioTelas: {
          include: {
            proveedor: {
              select: {
                id: true,
                nombre: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
       
        compraTelaItem: {
          include: {
            compra: {
              select: {
                id: true,
                numeroCompra: true,
                estado: true
              }
            }
          },
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!tela) {
      throw new NotFoundException(`Tela con ID ${id} no encontrada`);
    }

    return new TelaResponseDto(tela);
  }

  async update(id: number, updateTelaDto: UpdateTelaDto): Promise<TelaResponseDto> {
    const tela = await this.findOne(id);
    const { proveedorId, parametrosFisicosId, ...telaData } = updateTelaDto;

    try {
      const data: Prisma.TelaUpdateInput = { ...telaData };

      // Manejar actualización del proveedor
      if (proveedorId && proveedorId !== tela.proveedorId) {
        const proveedor = await this.prisma.proveedor.findUnique({
          where: { id: proveedorId }
        });

        if (!proveedor) {
          throw new NotFoundException(`Proveedor con ID ${proveedorId} no encontrado`);
        }

        data.proveedor = { connect: { id: proveedorId } };
      }

      // Manejar actualización de parámetros físicos
      if (parametrosFisicosId !== undefined) {
        if (parametrosFisicosId === null) {
          // Desconectar parámetros existentes
          data.parametrosFisicos = { disconnect: true };
        } else {
          // Conectar nuevos parámetros
          const parametros = await this.prisma.parametrosFisicosTela.findUnique({
            where: { id: parametrosFisicosId }
          });

          if (!parametros) {
            throw new NotFoundException(`Parámetros físicos con ID ${parametrosFisicosId} no encontrados`);
          }

          data.parametrosFisicos = { connect: { id: parametrosFisicosId } };
        }
      }

      const updatedTela = await this.prisma.tela.update({
        where: { id },
        data,
        include: {
          proveedor: true,
          parametrosFisicos: true,
          inventarioTelas: {
            take: 5,
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      return new TelaResponseDto(updatedTela);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Error al actualizar la tela');
        }
      }
      throw error;
    }
  }

  async assignParametroFisico(telaId: number, parametroId: number): Promise<TelaResponseDto> {
    const [tela, parametro] = await Promise.all([
      this.prisma.tela.findUnique({ where: { id: telaId } }),
      this.prisma.parametrosFisicosTela.findUnique({ where: { id: parametroId } })
    ]);

    if (!tela) {
      throw new NotFoundException(`Tela con ID ${telaId} no encontrada`);
    }

    if (!parametro) {
      throw new NotFoundException(`Parámetros físicos con ID ${parametroId} no encontrados`);
    }

    const updatedTela = await this.prisma.tela.update({
      where: { id: telaId },
      data: {
        parametrosFisicos: { connect: { id: parametroId } }
      },
      include: {
        proveedor: true,
        parametrosFisicos: true,
        inventarioTelas: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    return new TelaResponseDto(updatedTela);
  }

  async unassignParametroFisico(telaId: number): Promise<TelaResponseDto> {
    const tela = await this.prisma.tela.findUnique({
      where: { id: telaId },
      include: { parametrosFisicos: true }
    });

    if (!tela) {
      throw new NotFoundException(`Tela con ID ${telaId} no encontrada`);
    }

    if (!tela.parametrosFisicos) {
      throw new NotFoundException('La tela no tiene parámetros físicos asignados');
    }

    const updatedTela = await this.prisma.tela.update({
      where: { id: telaId },
      data: {
        parametrosFisicos: { disconnect: true }
      },
      include: {
        proveedor: true,
        parametrosFisicos: true,
        inventarioTelas: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    return new TelaResponseDto(updatedTela);
  }

  async getTelasByParametroFisico(parametroId: number): Promise<TelaResponseDto[]> {
    const parametro = await this.prisma.parametrosFisicosTela.findUnique({
      where: { id: parametroId }
    });

    if (!parametro) {
      throw new NotFoundException(`Parámetros físicos con ID ${parametroId} no encontrados`);
    }

    const telas = await this.prisma.tela.findMany({
      where: {
        parametrosFisicosId: parametroId
      },
      include: {
        proveedor: {
          select: {
            id: true,
            nombre: true,
            contacto: true
          }
        },
        parametrosFisicos: true,
        inventarioTelas: {
          take: 3,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { nombreComercial: 'asc' }
    });

    return telas.map(tela => new TelaResponseDto(tela));
  }

  async getInventarioTela(telaId?: number, proveedorId?: number): Promise<any[]> {
    const where: Prisma.InventarioTelaWhereInput = {};

    if (telaId) where.telaId = telaId;
    if (proveedorId) where.proveedorId = proveedorId;

    const inventario = await this.prisma.inventarioTela.findMany({
      where,
      include: {
        proveedor: {
          select: {
            id: true,
            nombre: true
          }
        },
        tela: {
          select: {
            id: true,
            nombreComercial: true,
            tipoTela: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return inventario;
  }

  async getEstadisticas(id: number): Promise<any> {
    const tela = await this.findOne(id);

    const [
      totalInventario,
      totalCompras,
      inventarioActual,
      comprasEsteMes
    ] = await Promise.all([
      this.prisma.inventarioTela.count({ where: { telaId: id } }),
      this.prisma.compraTelaItem.count({ where: { telaId: id } }),
      this.prisma.inventarioTela.aggregate({
        where: { telaId: id },
        _sum: { cantidadRollos: true }
      }),
      this.prisma.compraTelaItem.count({
        where: {
          telaId: id,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      })
    ]);

    return {
      tela: new TelaResponseDto(tela),
      estadisticas: {
        totalInventario,
        totalCompras,
        rollosEnInventario: inventarioActual._sum.cantidadRollos || 0,
        comprasEsteMes
      }
    };
  }

  async searchTelasByCaracteristicas(caracteristicas: string): Promise<TelaResponseDto[]> {
    const telas = await this.prisma.tela.findMany({
      where: {
        OR: [
          { nombreComercial: { contains: caracteristicas } },
          { tipoTela: { contains: caracteristicas } },
          { composicion: { contains: caracteristicas } },
          { colores: { contains: caracteristicas } },
          { acabado: { contains: caracteristicas } }
        ]
      },
      include: {
        proveedor: {
          select: {
            id: true,
            nombre: true
          }
        },
        parametrosFisicos: true,
        inventarioTelas: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      },
      take: 10
    });

    return telas.map(tela => new TelaResponseDto(tela));
  }

  async deleteTela(id: number): Promise<void> {
    const tela = await this.prisma.tela.findUnique({
      where: { id }

    });

    if (!tela) {
      throw new NotFoundException(`Parámetros físicos con ID ${id} no encontrados`);
    }



    await this.prisma.tela.delete({
      where: { id }
    });
  }
}