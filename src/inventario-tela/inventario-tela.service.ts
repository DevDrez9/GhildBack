import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';

import { CreateInventarioTelaDto } from './dto/create-inventario-tela.dto';
import { UpdateInventarioTelaDto } from './dto/update-inventario-tela.dto';
import { FilterInventarioTelaDto } from './dto/filter-inventario-tela.dto';
import { InventarioTelaResponseDto } from './dto/inventario-tela-response.dto';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from 'generated/prisma/client';

@Injectable()
export class InventarioTelaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createInventarioTelaDto: CreateInventarioTelaDto): Promise<InventarioTelaResponseDto> {
    const { proveedorId, telaId, importe, ...inventarioData } = createInventarioTelaDto;

    // Verificar que el proveedor existe
    const proveedor = await this.prisma.proveedor.findUnique({
      where: { id: proveedorId }
    });

    if (!proveedor) {
      throw new NotFoundException(`Proveedor con ID ${proveedorId} no encontrado`);
    }

    // Verificar que la tela existe
    const tela = await this.prisma.tela.findUnique({
      where: { id: telaId }
    });

    if (!tela) {
      throw new NotFoundException(`Tela con ID ${telaId} no encontrada`);
    }

    // Calcular importe si no se proporciona
    const calculatedImporte = importe || (inventarioData.precioKG * inventarioData.pesoGrupo);

    try {
      const inventarioTela = await this.prisma.inventarioTela.create({
        data: {
          ...inventarioData,
          importe: calculatedImporte,
          proveedor: { connect: { id: proveedorId } },
          tela: { connect: { id: telaId } }
        },
        include: {
          proveedor: {
            select: {
              id: true,
              nombre: true,
              contacto: true,
              telefono: true,
              email: true
            }
          },
          tela: {
            select: {
              id: true,
              nombreComercial: true,
              tipoTela: true,
              composicion: true,
              gramaje: true
            }
          }
        }
      });

      return new InventarioTelaResponseDto(inventarioTela);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Error al crear el inventario de tela');
        }
      }
      throw error;
    }
  }
     async createMany(
        createInventarioTelaDtos: CreateInventarioTelaDto[],
    ): Promise<InventarioTelaResponseDto[]> {
        
        // 1. **Verificación de dependencias (FUERA de la transacción)**
        const proveedorIds = [
            ...new Set(createInventarioTelaDtos.map(dto => dto.proveedorId)),
        ];
        const telaIds = [
            ...new Set(createInventarioTelaDtos.map(dto => dto.telaId)),
        ];

        const [proveedores, telas] = await Promise.all([
            this.prisma.proveedor.findMany({ where: { id: { in: proveedorIds } } }),
            this.prisma.tela.findMany({ where: { id: { in: telaIds } } }),
        ]);

        const existingProveedorIds = new Set(proveedores.map(p => p.id));
        const existingTelaIds = new Set(telas.map(t => t.id));

        // Lanzar excepción si falta algún ID (Mantenemos esta validación importante)
        for (const id of proveedorIds) {
            if (!existingProveedorIds.has(id)) {
                throw new NotFoundException(`Proveedor con ID ${id} no encontrado`);
            }
        }
        for (const id of telaIds) {
            if (!existingTelaIds.has(id)) {
                throw new NotFoundException(`Tela con ID ${id} no encontrada`);
            }
        }

        // 2. **Ejecutar las operaciones de UPSERT dentro de una transacción**
        const inventariosResultados: Prisma.InventarioTelaGetPayload<{
            include: { proveedor: { select: any }, tela: { select: any } }; 
        }>[] = [];

        // Usamos una única transacción para garantizar que todos los cambios sean atómicos.
        await this.prisma.$transaction(async (tx) => {
            
            for (const dto of createInventarioTelaDtos) {
                const { proveedorId, telaId, importe, ...inventarioData } = dto;

                // Definir la condición de búsqueda/actualización
                const upsertWhere = {
                    telaId: telaId,
                    color: inventarioData.color,
                };
                
                // Buscar si ya existe la combinación (telaId + color)
                const existingInventario = await tx.inventarioTela.findFirst({
                    where: upsertWhere,
                });

                // Calcular el importe (Fuera del upsert para reutilizarlo)
                const calculatedImporte = importe || (inventarioData.precioKG * inventarioData.pesoGrupo);
                
                let inventarioOperado;
                const baseData = {
                    ...inventarioData,
                    importe: calculatedImporte,
                };


                if (existingInventario) {
                    // ⭐ FLUIDO DE ACTUALIZACIÓN (UPDATE) ⭐
                    inventarioOperado = await tx.inventarioTela.update({
                        where: { id: existingInventario.id },
                        data: {
                            // Actualizar solo las cantidades:
                            cantidadRollos: { increment: inventarioData.cantidadRollos },
                            pesoGrupo: { increment: inventarioData.pesoGrupo },
                            // Actualizar importe sumándole el nuevo valor (opcional, dependiendo de la lógica):
                            importe: { increment: calculatedImporte }, 
                            // Opcional: Actualizar el precioKG al precio más reciente, si se desea
                            precioKG: inventarioData.precioKG,
                            
                            // Otros campos deben ser actualizados si se desea
                            presentacion: inventarioData.presentacion,
                            tipoTela: inventarioData.tipoTela,
                            // El proveedor/tela/color ya existe, no se actualizan
                        },
                        include: {
                            proveedor: { select: { id: true, nombre: true, contacto: true, telefono: true, email: true } },
                            tela: { select: { id: true, nombreComercial: true, tipoTela: true, composicion: true, gramaje: true } },
                        },
                    });
                } else {
                    // ⭐ FLUIDO DE CREACIÓN (CREATE) ⭐
                    inventarioOperado = await tx.inventarioTela.create({
                        data: {
                            ...baseData,
                            proveedor: { connect: { id: proveedorId } },
                            tela: { connect: { id: telaId } },
                        },
                        include: {
                            proveedor: { select: { id: true, nombre: true, contacto: true, telefono: true, email: true } },
                            tela: { select: { id: true, nombreComercial: true, tipoTela: true, composicion: true, gramaje: true } },
                        },
                    });
                }
                
                // Agregar el resultado a la lista de resultados de la transacción
                inventariosResultados.push(inventarioOperado);
            }
        }); // Fin de la transacción

        // 3. Mapear los resultados a los DTOs de respuesta
        return inventariosResultados.map(
            inventario => new InventarioTelaResponseDto(inventario),
        );
    }

  async findAll(filterInventarioTelaDto: FilterInventarioTelaDto = {}): Promise<InventarioTelaResponseDto[]> {
    const { proveedorId, telaId, tipoTela, color, presentacion } = filterInventarioTelaDto;

    const where: Prisma.InventarioTelaWhereInput = {};

    if (proveedorId) where.proveedorId = proveedorId;
    if (telaId) where.telaId = telaId;
    if (tipoTela) where.tipoTela = { contains: tipoTela };
    if (color) where.color = { contains: color };
    if (presentacion) where.presentacion = { contains: presentacion };

    const inventarioTelas = await this.prisma.inventarioTela.findMany({
      where,
      include: {
        proveedor: {
          select: {
            id: true,
            nombre: true,
            contacto: true
          }
        },
        tela: {
          select: {
            id: true,
            nombreComercial: true,
            tipoTela: true,
            composicion: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return inventarioTelas.map(inventario => new InventarioTelaResponseDto(inventario));
  }

  async findAllPaginated(
    filterInventarioTelaDto: FilterInventarioTelaDto = {},
    page: number = 1,
    limit: number = 10
  ): Promise<{ inventarioTelas: InventarioTelaResponseDto[], total: number, page: number, totalPages: number }> {
    const { proveedorId, telaId, tipoTela, color, presentacion } = filterInventarioTelaDto;

    const where: Prisma.InventarioTelaWhereInput = {};

    if (proveedorId) where.proveedorId = proveedorId;
    if (telaId) where.telaId = telaId;
    if (tipoTela) where.tipoTela = { contains: tipoTela };
    if (color) where.color = { contains: color };
    if (presentacion) where.presentacion = { contains: presentacion };

    const [inventarioTelas, total] = await Promise.all([
      this.prisma.inventarioTela.findMany({
        where,
        include: {
          proveedor: {
            select: {
              id: true,
              nombre: true,
              contacto: true
            }
          },
          tela: {
            select: {
              id: true,
              nombreComercial: true,
              tipoTela: true,
              composicion: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      this.prisma.inventarioTela.count({ where })
    ]);

    return {
      inventarioTelas: inventarioTelas.map(inventario => new InventarioTelaResponseDto(inventario)),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async findOne(id: number): Promise<InventarioTelaResponseDto> {
    const inventarioTela = await this.prisma.inventarioTela.findUnique({
      where: { id },
      include: {
        proveedor: {
          select: {
            id: true,
            nombre: true,
            contacto: true,
            telefono: true,
            email: true,
            direccion: true
          }
        },
        tela: {
          select: {
            id: true,
            nombreComercial: true,
            tipoTela: true,
            composicion: true,
            gramaje: true,
            acabado: true,
            colores: true
          }
        }
      }
    });

    if (!inventarioTela) {
      throw new NotFoundException(`Inventario de tela con ID ${id} no encontrado`);
    }

    return new InventarioTelaResponseDto(inventarioTela);
  }

  async update(id: number, updateInventarioTelaDto: UpdateInventarioTelaDto): Promise<InventarioTelaResponseDto> {
    const inventario = await this.findOne(id);
    const { proveedorId, telaId, importe, ...inventarioData } = updateInventarioTelaDto;

    try {
      const data: Prisma.InventarioTelaUpdateInput = { ...inventarioData };

      // Manejar actualización del proveedor
      if (proveedorId && proveedorId !== inventario.proveedorId) {
        const proveedor = await this.prisma.proveedor.findUnique({
          where: { id: proveedorId }
        });

        if (!proveedor) {
          throw new NotFoundException(`Proveedor con ID ${proveedorId} no encontrado`);
        }

        data.proveedor = { connect: { id: proveedorId } };
      }

      // Manejar actualización de la tela
      if (telaId && telaId !== inventario.telaId) {
        const tela = await this.prisma.tela.findUnique({
          where: { id: telaId }
        });

        if (!tela) {
          throw new NotFoundException(`Tela con ID ${telaId} no encontrada`);
        }

        data.tela = { connect: { id: telaId } };
      }

      // Recalcular importe si cambian precioKG o pesoGrupo
      if (inventarioData.precioKG !== undefined || inventarioData.pesoGrupo !== undefined) {
        const precioKG = inventarioData.precioKG ?? inventario.precioKG;
        const pesoGrupo = inventarioData.pesoGrupo ?? inventario.pesoGrupo;
        data.importe = precioKG * pesoGrupo;
      } else if (importe !== undefined) {
        data.importe = importe;
      }

      const updatedInventario = await this.prisma.inventarioTela.update({
        where: { id },
        data,
        include: {
          proveedor: {
            select: {
              id: true,
              nombre: true,
              contacto: true
            }
          },
          tela: {
            select: {
              id: true,
              nombreComercial: true,
              tipoTela: true,
              composicion: true
            }
          }
        }
      });

      return new InventarioTelaResponseDto(updatedInventario);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Error al actualizar el inventario de tela');
        }
      }
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    const inventario = await this.findOne(id);

    await this.prisma.inventarioTela.delete({
      where: { id }
    });
  }

  async getStats(proveedorId?: number): Promise<any> {
    const where: Prisma.InventarioTelaWhereInput = {};
    
    if (proveedorId) {
      where.proveedorId = proveedorId;
    }

    const [
      totalRegistros,
      totalRollos,
      valorTotal,
      tiposTelaCount
    ] = await Promise.all([
      this.prisma.inventarioTela.count({ where }),
      this.prisma.inventarioTela.aggregate({
        where,
        _sum: { cantidadRollos: true }
      }),
      this.prisma.inventarioTela.aggregate({
        where,
        _sum: { importe: true }
      }),
      this.prisma.inventarioTela.groupBy({
        by: ['tipoTela'],
        where,
        _sum: { cantidadRollos: true }
      })
    ]);

    return {
      totalRegistros,
      totalRollos: totalRollos._sum.cantidadRollos || 0,
      valorTotal: valorTotal._sum.importe || 0,
      tiposTela: tiposTelaCount.map(item => ({
        tipoTela: item.tipoTela,
        totalRollos: item._sum.cantidadRollos
      }))
    };
  }
}