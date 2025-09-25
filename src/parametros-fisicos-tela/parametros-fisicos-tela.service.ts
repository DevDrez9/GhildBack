import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';

import { CreateParametrosFisicosTelaDto } from './dto/create-parametros-fisicos-tela.dto';
import { UpdateParametrosFisicosTelaDto } from './dto/update-parametros-fisicos-tela.dto';
import { ParametrosFisicosTelaResponseDto } from './dto/parametros-fisicos-tela-response.dto';
import { PrismaService } from 'src/prisma.service';
import { TelaResponseDto } from 'src/tela/dto/tela-response.dto';

@Injectable()
export class ParametrosFisicosTelaService {
  constructor(private readonly prisma: PrismaService) {}

  // ... otros métodos ...

  async create(createDto: CreateParametrosFisicosTelaDto): Promise<ParametrosFisicosTelaResponseDto> {
    // ... validaciones ...

    try {
      const parametros = await this.prisma.parametrosFisicosTela.create({
        data: {
          nombre: createDto.nombre,
          descripcion: createDto.descripcion,
          anchoTela: createDto.anchoTela,
          tubular: createDto.tubular || false,
          notasTela: createDto.notasTela,
          ...(createDto.telaId && {
            tela: { connect: { id: createDto.telaId } }
          })
        },
       
      });

      // Usar el constructor con mapeo manual
      return new ParametrosFisicosTelaResponseDto(parametros);
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Error al crear los parámetros físicos');
      }
      throw error;
    }
  }

  async findAll(): Promise<ParametrosFisicosTelaResponseDto[]> {
    const parametros = await this.prisma.parametrosFisicosTela.findMany({
      
      orderBy: { nombre: 'asc' }
    });

    // Mapear manualmente cada resultado
    return parametros.map(param => new ParametrosFisicosTelaResponseDto(param));
  }

  async findOne(id: number): Promise<ParametrosFisicosTelaResponseDto> {
    const parametros = await this.prisma.parametrosFisicosTela.findUnique({
      where: { id },
      
    });

    if (!parametros) {
      throw new NotFoundException(`Parámetros físicos con ID ${id} no encontrados`);
    }

    return new ParametrosFisicosTelaResponseDto(parametros);
  }

  async update(id: number, updateDto: UpdateParametrosFisicosTelaDto): Promise<ParametrosFisicosTelaResponseDto> {
    // ... validaciones ...

    try {
      const data: any = { ...updateDto };
      
      // Manejar la conexión/desconexión de la tela
      if (updateDto.telaId === null) {
        data.tela = { disconnect: true };
      } else if (updateDto.telaId !== undefined) {
        data.tela = { connect: { id: updateDto.telaId } };
      }

      const updatedParams = await this.prisma.parametrosFisicosTela.update({
        where: { id },
        data,
        
      });

      return new ParametrosFisicosTelaResponseDto(updatedParams);
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Error al actualizar los parámetros físicos');
      }
      throw error;
    }
  }

 
 async getTelasByParametro(id: number): Promise<TelaResponseDto[]> {
    const parametro = await this.prisma.parametrosFisicosTela.findUnique({
      where: { id },
      include: {
        telas: {
          include: {
            proveedor: true,
            inventarioTelas: {
              take: 3,
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      }
    });

    if (!parametro) {
      throw new NotFoundException(`Parámetros físicos con ID ${id} no encontrados`);
    }

    return parametro.telas.map(tela => new TelaResponseDto(tela));
  }

  async deleteParametro(id: number): Promise<void> {
    const parametro = await this.prisma.parametrosFisicosTela.findUnique({
      where: { id },
      include: { telas: true }
    });

    if (!parametro) {
      throw new NotFoundException(`Parámetros físicos con ID ${id} no encontrados`);
    }

    // Verificar si el parámetro está siendo usado por alguna tela
    if (parametro.telas.length > 0) {
      const telaIds = parametro.telas.map(t => t.id);
      throw new ConflictException(
        `No se puede eliminar el parámetro porque está siendo usado por las telas con IDs: ${telaIds.join(', ')}`
      );
    }

    await this.prisma.parametrosFisicosTela.delete({
      where: { id }
    });
  }
  
}