import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

import { CreateTransferenciaInventarioDto } from './dto/create-transferencia-inventario.dto';
import { UpdateTransferenciaInventarioDto } from './dto/update-transferencia-inventario.dto';
import { UpdateEstadoTransferenciaDto } from './dto/update-estado-transferencia.dto';
import { TransferenciaInventarioResponseDto } from './dto/transferencia-inventario-response.dto';
import { FilterTransferenciaInventarioDto } from './dto/filter-transferencia-inventario.dto';
import { PrismaService } from 'src/prisma.service';
import { EstadoTransferencia, Prisma, TipoDestinoTransferencia, TipoOrigenTransferencia } from 'generated/prisma/client';

@Injectable()
export class TransferenciaInventarioService {
  constructor(private readonly prisma: PrismaService) {}

  private async generarCodigoTransferencia(): Promise<string> {
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const day = new Date().getDate().toString().padStart(2, '0');
    
    // Contar transferencias de hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const count = await this.prisma.transferenciaInventario.count({
      where: {
        createdAt: {
          gte: today
        }
      }
    });

    const numero = (count + 1).toString().padStart(4, '0');
    return `TRF-${year}${month}${day}-${numero}`;
  }

  private async validarStockOrigen(
    origenTipo: TipoOrigenTransferencia,
    origenId: number,
    productoId: number,
    cantidad: number
  ): Promise<void> {
    let stockDisponible = 0;

    if (origenTipo === 'FABRICA') {
      // Verificar stock en inventario de tienda
      const inventario = await this.prisma.inventarioTienda.findUnique({
        where: {
          productoId_tiendaId: {
            productoId,
            tiendaId: origenId
          }
        }
      });

      if (!inventario) {
        throw new NotFoundException('No se encontró inventario en el origen');
      }

      stockDisponible = inventario.stock;
    } else if (origenTipo === 'SUCURSAL') {
      // Verificar stock en inventario de sucursal
      const inventario = await this.prisma.inventarioSucursal.findUnique({
        where: {
          productoId_sucursalId: {
            productoId,
            sucursalId: origenId
          }
        }
      });

      if (!inventario) {
        throw new NotFoundException('No se encontró inventario en el origen');
      }

      stockDisponible = inventario.stock;
    }

    if (stockDisponible < cantidad) {
      throw new BadRequestException(`Stock insuficiente en el origen. Disponible: ${stockDisponible}, Solicitado: ${cantidad}`);
    }
  }

  private async obtenerEntidadOrigen(origenTipo: TipoOrigenTransferencia, origenId: number): Promise<any> {
    if (origenTipo === 'FABRICA') {
      return await this.prisma.tienda.findUnique({
        where: { id: origenId },
        select: { id: true, nombre: true, dominio: true }
      });
    } else if (origenTipo === 'SUCURSAL') {
      return await this.prisma.sucursal.findUnique({
        where: { id: origenId },
        include: { tienda: true }
      });
    }
    return null;
  }

  private async obtenerEntidadDestino(destinoTipo: TipoDestinoTransferencia, destinoId: number): Promise<any> {
    if (destinoTipo === 'FABRICA') {
      return await this.prisma.tienda.findUnique({
        where: { id: destinoId },
        select: { id: true, nombre: true, dominio: true }
      });
    } else if (destinoTipo === 'SUCURSAL') {
      return await this.prisma.sucursal.findUnique({
        where: { id: destinoId },
        include: { tienda: true }
      });
    }
    return null;
  }

   async create(createTransferenciaInventarioDto: CreateTransferenciaInventarioDto): Promise<TransferenciaInventarioResponseDto> {
        const { 
            codigo, 
            usuarioId, 
            productoId, 
            origenTipo, 
            destinoTipo, 
            origenId, 
            destinoId, 
            cantidad, 
            motivo,
            ...transferenciaData 
        } = createTransferenciaInventarioDto;

        // -------------------------------------------------------------------
        // 1. Validar si la función debe ejecutar la transferencia de stock
        // -------------------------------------------------------------------
        if (origenTipo !== 'FABRICA' || destinoTipo !== 'SUCURSAL') {
            throw new BadRequestException('Esta función de creación solo soporta transferencias de TIENDA a SUCURSAL.');
        }

        if (cantidad <= 0) {
            throw new BadRequestException('La cantidad de transferencia debe ser mayor a cero');
        }

        // -------------------------------------------------------------------
        // 2. Obtener y validar entidades (Producto, Usuario, Inventarios)
        // -------------------------------------------------------------------

        const [producto, usuario, inventarioOrigen, inventarioDestino] = await Promise.all([
            this.prisma.producto.findUnique({ where: { id: productoId } }),
            this.prisma.usuario.findUnique({ where: { id: usuarioId } }),
            // Obtener inventario de la Tienda (Origen)
            this.prisma.inventarioTienda.findUnique({ where: { id: origenId } }),
            // Obtener inventario de la Sucursal (Destino)
            this.prisma.inventarioSucursal.findUnique({ where: { id: destinoId } }), 
        ]);

        if (!producto) {
            throw new NotFoundException(`Producto con ID ${productoId} no encontrado`);
        }
        if (!usuario) {
            throw new NotFoundException(`Usuario con ID ${usuarioId} no encontrado`);
        }
        if (!inventarioOrigen) {
            throw new NotFoundException(`Inventario de Tienda (Origen) con ID ${origenId} no encontrado`);
        }
        if (!inventarioDestino) {
            throw new NotFoundException(`Inventario de Sucursal (Destino) con ID ${destinoId} no encontrado`);
        }

        // -------------------------------------------------------------------
        // 3. Validar consistencia y stock
        // -------------------------------------------------------------------

        if (inventarioOrigen.productoId !== inventarioDestino.productoId) {
             throw new BadRequestException('Solo se pueden transferir el mismo producto');
        }

        if (inventarioOrigen.stock < cantidad) {
            throw new BadRequestException('Stock insuficiente en el inventario de origen (Tienda)');
        }

        // -------------------------------------------------------------------
        // 4. Ejecutar Transferencia y Transacción de Base de Datos
        // -------------------------------------------------------------------
        
        const codigoTransferencia = codigo || await this.generarCodigoTransferencia();

        try {
            const resultadoTransaccion = await this.prisma.$transaction(async (prisma) => {
                
                // 4.1. Crear el registro de Transferencia (con estado final)
                const transferencia = await prisma.transferenciaInventario.create({
                    data: {
                        ...transferenciaData,
                        origenTipo,
                        destinoTipo,
                        origenId,
                        destinoId,
                        cantidad,
                        codigo: codigoTransferencia,
                        // El estado se marca como COMPLETADA, ya que el stock se modifica
                        estado: EstadoTransferencia.COMPLETADA, 
                        producto: { connect: { id: productoId } },
                        usuario: { connect: { id: usuarioId } }
                    },
                    // Incluir datos para el DTO final
                    include: {
                         producto: {
                            include: {
                                categoria: true,
                                imagenes: { take: 1, orderBy: { orden: 'asc' } }
                            }
                        },
                        usuario: {
                            select: { id: true, nombre: true, email: true }
                        },
                        movimientos: true
                    }
                });

                // 4.2. Restar stock del origen (InventarioTienda)
                const origenActualizado = await prisma.inventarioTienda.update({
                    where: { id: origenId },
                    data: {
                        stock: { decrement: cantidad }
                    }
                });

                // 4.3. Sumar stock al destino (InventarioSucursal) <-- CAMBIO CRUCIAL
                const destinoActualizado = await prisma.inventarioSucursal.update({ 
                    where: { id: destinoId },
                    data: {
                        stock: { increment: cantidad }
                    }
                });

                // 4.4. Registrar movimiento de salida (Desde InventarioTienda)
                await prisma.movimientoInventario.create({
                    data: {
                        tipo: 'TRANSFERENCIA_SALIDA',
                        cantidad: cantidad,
                        productoId: productoId,
                        motivo: `Salida por Transferencia a Sucursal #${destinoId}: ${motivo}`,
                        usuarioId: usuarioId,
                        inventarioTiendaId: origenId, 
                        stockAnterior: inventarioOrigen.stock,
                        stockNuevo: origenActualizado.stock,
                        transferenciaId: transferencia.id // Vincular a la transferencia creada
                    }
                });

                // 4.5. Registrar movimiento de entrada (A InventarioSucursal) <-- CAMBIO CRUCIAL
                await prisma.movimientoInventario.create({
                    data: {
                        tipo: 'TRANSFERENCIA_ENTRADA',
                        cantidad: cantidad,
                        productoId: productoId,
                        motivo: `Entrada por Transferencia desde Tienda #${origenId}: ${motivo}`,
                        usuarioId: usuarioId,
                        inventarioSucursalId: destinoId, // Usar el campo Sucursal
                        stockAnterior: inventarioDestino.stock,
                        stockNuevo: destinoActualizado.stock,
                        transferenciaId: transferencia.id // Vincular a la transferencia creada
                    }
                });
                
                return transferencia;
            });
            
            // -------------------------------------------------------------------
            // 5. Preparar la respuesta DTO
            // -------------------------------------------------------------------
            
            // Obtener detalles de origen y destino para el DTO de respuesta
            const [origen, destino] = await Promise.all([
                this.obtenerEntidadOrigen(resultadoTransaccion.origenTipo, resultadoTransaccion.origenId),
                this.obtenerEntidadDestino(resultadoTransaccion.destinoTipo, resultadoTransaccion.destinoId)
            ]);

            return new TransferenciaInventarioResponseDto({
                ...resultadoTransaccion,
                origen,
                destino
            });

        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    throw new ConflictException('Error al crear la transferencia (código duplicado o conflicto)');
                }
            }
            throw error;
        }
    }

  async findAll(filterTransferenciaInventarioDto: FilterTransferenciaInventarioDto = {}): Promise<{ transferencias: TransferenciaInventarioResponseDto[], total: number }> {
    const {
      estado,
      origenTipo,
      destinoTipo,
      productoId,
      usuarioId,
      codigo,
      fechaInicio,
      fechaFin,
      page = 1,
      limit = 10
    } = filterTransferenciaInventarioDto;

    const where: Prisma.TransferenciaInventarioWhereInput = {};

    if (estado) where.estado = estado;
    if (origenTipo) where.origenTipo = origenTipo;
    if (destinoTipo) where.destinoTipo = destinoTipo;
    if (productoId) where.productoId = productoId;
    if (usuarioId) where.usuarioId = usuarioId;
    if (codigo) where.codigo = { contains: codigo };

    if (fechaInicio || fechaFin) {
      where.createdAt = {};
      if (fechaInicio) where.createdAt.gte = new Date(fechaInicio);
      if (fechaFin) {
        const fechaFinDate = new Date(fechaFin);
        fechaFinDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = fechaFinDate;
      }
    }

    const [transferencias, total] = await Promise.all([
      this.prisma.transferenciaInventario.findMany({
        where,
        include: {
          producto: {
            include: {
              categoria: true,
              imagenes: {
                take: 1,
                orderBy: { orden: 'asc' }
              }
            }
          },
          usuario: {
            select: {
              id: true,
              nombre: true,
              email: true
            }
          },
          movimientos: {
            take: 5,
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      this.prisma.transferenciaInventario.count({ where })
    ]);

    // Obtener detalles de origen y destino para cada transferencia
    const transferenciasCompletas = await Promise.all(
      transferencias.map(async (transferencia) => {
        const [origen, destino] = await Promise.all([
          this.obtenerEntidadOrigen(transferencia.origenTipo, transferencia.origenId),
          this.obtenerEntidadDestino(transferencia.destinoTipo, transferencia.destinoId)
        ]);

        return new TransferenciaInventarioResponseDto({
          ...transferencia,
          origen,
          destino
        });
      })
    );

    return {
      transferencias: transferenciasCompletas,
      total
    };
  }

  async findOne(id: number): Promise<TransferenciaInventarioResponseDto> {
    const transferencia = await this.prisma.transferenciaInventario.findUnique({
      where: { id },
      include: {
        producto: {
          include: {
            categoria: true,
            subcategoria: true,
            imagenes: true,
            proveedor: true
          }
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            rol: true
          }
        },
        movimientos: {
          include: {
            usuario: {
              select: {
                id: true,
                nombre: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!transferencia) {
      throw new NotFoundException(`Transferencia con ID ${id} no encontrada`);
    }

    // Obtener detalles de origen y destino
    const [origen, destino] = await Promise.all([
      this.obtenerEntidadOrigen(transferencia.origenTipo, transferencia.origenId),
      this.obtenerEntidadDestino(transferencia.destinoTipo, transferencia.destinoId)
    ]);

    return new TransferenciaInventarioResponseDto({
      ...transferencia,
      origen,
      destino
    });
  }

  async findByCodigo(codigo: string): Promise<TransferenciaInventarioResponseDto> {
    const transferencia = await this.prisma.transferenciaInventario.findUnique({
      where: { codigo },
      include: {
        producto: {
          include: {
            categoria: true,
            imagenes: {
              take: 1,
              orderBy: { orden: 'asc' }
            }
          }
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        movimientos: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!transferencia) {
      throw new NotFoundException(`Transferencia con código ${codigo} no encontrada`);
    }

    // Obtener detalles de origen y destino
    const [origen, destino] = await Promise.all([
      this.obtenerEntidadOrigen(transferencia.origenTipo, transferencia.origenId),
      this.obtenerEntidadDestino(transferencia.destinoTipo, transferencia.destinoId)
    ]);

    return new TransferenciaInventarioResponseDto({
      ...transferencia,
      origen,
      destino
    });
  }

  async update(id: number, updateTransferenciaInventarioDto: UpdateTransferenciaInventarioDto): Promise<TransferenciaInventarioResponseDto> {
    const transferencia = await this.findOne(id);

    // Solo permitir actualizar transferencias en estado PENDIENTE
    if (transferencia.estado !== 'PENDIENTE') {
      throw new BadRequestException('Solo se pueden modificar transferencias en estado PENDIENTE');
    }

    const { productoId, usuarioId, ...transferenciaData } = updateTransferenciaInventarioDto;

    try {
      const data: Prisma.TransferenciaInventarioUpdateInput = { ...transferenciaData };

      if (productoId && productoId !== transferencia.productoId) {
        const producto = await this.prisma.producto.findUnique({
          where: { id: productoId }
        });

        if (!producto) {
          throw new NotFoundException(`Producto con ID ${productoId} no encontrado`);
        }

        data.producto = { connect: { id: productoId } };
      }

      if (usuarioId && usuarioId !== transferencia.usuarioId) {
        const usuario = await this.prisma.usuario.findUnique({
          where: { id: usuarioId }
        });

        if (!usuario) {
          throw new NotFoundException(`Usuario con ID ${usuarioId} no encontrado`);
        }

        data.usuario = { connect: { id: usuarioId } };
      }

      const updatedTransferencia = await this.prisma.transferenciaInventario.update({
        where: { id },
        data,
        include: {
          producto: {
            include: {
              categoria: true,
              imagenes: {
                take: 1,
                orderBy: { orden: 'asc' }
              }
            }
          },
          usuario: {
            select: {
              id: true,
              nombre: true,
              email: true
            }
          }
        }
      });

      // Obtener detalles de origen y destino
      const [origen, destino] = await Promise.all([
        this.obtenerEntidadOrigen(updatedTransferencia.origenTipo, updatedTransferencia.origenId),
        this.obtenerEntidadDestino(updatedTransferencia.destinoTipo, updatedTransferencia.destinoId)
      ]);

      return new TransferenciaInventarioResponseDto({
        ...updatedTransferencia,
        origen,
        destino
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Error al actualizar la transferencia');
        }
      }
      throw error;
    }
  }

  async updateEstado(id: number, updateEstadoTransferenciaDto: UpdateEstadoTransferenciaDto): Promise<TransferenciaInventarioResponseDto> {
    const transferencia = await this.findOne(id);
    const { estado, observaciones } = updateEstadoTransferenciaDto;

    const updatedTransferencia = await this.prisma.transferenciaInventario.update({
      where: { id },
      data: {
        estado,
        motivo: observaciones ? `${transferencia.motivo || ''} | ${observaciones}`.trim() : transferencia.motivo
      },
      include: {
        producto: {
          include: {
            categoria: true,
            imagenes: {
              take: 1,
              orderBy: { orden: 'asc' }
            }
          }
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });

    // Si el estado es COMPLETADA, procesar la transferencia
    if (estado === 'COMPLETADA') {
      await this.procesarTransferencia(id);
    }

    // Obtener detalles de origen y destino
    const [origen, destino] = await Promise.all([
      this.obtenerEntidadOrigen(updatedTransferencia.origenTipo, updatedTransferencia.origenId),
      this.obtenerEntidadDestino(updatedTransferencia.destinoTipo, updatedTransferencia.destinoId)
    ]);

    return new TransferenciaInventarioResponseDto({
      ...updatedTransferencia,
      origen,
      destino
    });
  }

  private async procesarTransferencia(transferenciaId: number): Promise<void> {
    const transferencia = await this.findOne(transferenciaId);

    if (transferencia.estado !== 'COMPLETADA') {
      throw new BadRequestException('Solo se pueden procesar transferencias en estado COMPLETADA');
    }

    try {
      await this.prisma.$transaction(async (prisma) => {
        // Procesar salida del origen
        if (transferencia.origenTipo === 'FABRICA') {
          await prisma.inventarioTienda.update({
            where: {
              productoId_tiendaId: {
                productoId: transferencia.productoId,
                tiendaId: transferencia.origenId
              }
            },
            data: {
              stock: { decrement: transferencia.cantidad }
            }
          });
        } else if (transferencia.origenTipo === 'SUCURSAL') {
          await prisma.inventarioSucursal.update({
            where: {
              productoId_sucursalId: {
                productoId: transferencia.productoId,
                sucursalId: transferencia.origenId
              }
            },
            data: {
              stock: { decrement: transferencia.cantidad }
            }
          });
        }

        // Procesar entrada al destino
        if (transferencia.destinoTipo === 'FABRICA') {
          const inventarioExistente = await prisma.inventarioTienda.findUnique({
            where: {
              productoId_tiendaId: {
                productoId: transferencia.productoId,
                tiendaId: transferencia.destinoId
              }
            }
          });

          if (inventarioExistente) {
            await prisma.inventarioTienda.update({
              where: {
                productoId_tiendaId: {
                  productoId: transferencia.productoId,
                  tiendaId: transferencia.destinoId
                }
              },
              data: {
                stock: { increment: transferencia.cantidad }
              }
            });
          } else {
            await prisma.inventarioTienda.create({
              data: {
                productoId: transferencia.productoId,
                tiendaId: transferencia.destinoId,
                stock: transferencia.cantidad,
                stockMinimo: 5
              }
            });
          }
        } else if (transferencia.destinoTipo === 'SUCURSAL') {
          const inventarioExistente = await prisma.inventarioSucursal.findUnique({
            where: {
              productoId_sucursalId: {
                productoId: transferencia.productoId,
                sucursalId: transferencia.destinoId
              }
            }
          });

          if (inventarioExistente) {
            await prisma.inventarioSucursal.update({
              where: {
                productoId_sucursalId: {
                  productoId: transferencia.productoId,
                  sucursalId: transferencia.destinoId
                }
              },
              data: {
                stock: { increment: transferencia.cantidad }
              }
            });
          } else {
            // Obtener la tienda de la sucursal
            const sucursal = await prisma.sucursal.findUnique({
              where: { id: transferencia.destinoId }
            });

            if (!sucursal) {
              throw new NotFoundException('Sucursal no encontrada');
            }

            await prisma.inventarioSucursal.create({
              data: {
                productoId: transferencia.productoId,
                sucursalId: transferencia.destinoId,
                tiendaId: sucursal.tiendaId,
                stock: transferencia.cantidad,
                stockMinimo: 5
              }
            });
          }
        }

        // Registrar movimientos de inventario
        await prisma.movimientoInventario.create({
          data: {
            tipo: 'TRANSFERENCIA_SALIDA',
            cantidad: transferencia.cantidad,
            productoId: transferencia.productoId,
            motivo: `Transferencia ${transferencia.codigo} a ${transferencia.destinoTipo.toLowerCase()}`,
            usuarioId: transferencia.usuarioId,
            transferenciaId: transferencia.id,
            ...(transferencia.origenTipo === 'FABRICA' && {
              inventarioTiendaId: transferencia.origenId
            }),
            ...(transferencia.origenTipo === 'SUCURSAL' && {
              inventarioSucursalId: transferencia.origenId
            })
          }
        });

        await prisma.movimientoInventario.create({
          data: {
            tipo: 'TRANSFERENCIA_ENTRADA',
            cantidad: transferencia.cantidad,
            productoId: transferencia.productoId,
            motivo: `Transferencia ${transferencia.codigo} desde ${transferencia.origenTipo.toLowerCase()}`,
            usuarioId: transferencia.usuarioId,
            transferenciaId: transferencia.id,
            ...(transferencia.destinoTipo === 'FABRICA' && {
              inventarioTiendaId: transferencia.destinoId
            }),
            ...(transferencia.destinoTipo === 'SUCURSAL' && {
              inventarioSucursalId: transferencia.destinoId
            })
          }
        });
      });
    } catch (error) {
      throw new ConflictException('Error al procesar la transferencia: ' + error.message);
    }
  }

  async remove(id: number): Promise<void> {
    const transferencia = await this.findOne(id);

    // Solo permitir eliminar transferencias en estado PENDIENTE
    if (transferencia.estado !== 'PENDIENTE') {
      throw new BadRequestException('Solo se pueden eliminar transferencias en estado PENDIENTE');
    }

    // Verificar si hay movimientos asociados
    const totalMovimientos = await this.prisma.movimientoInventario.count({
      where: { transferenciaId: id }
    });

    if (totalMovimientos > 0) {
      throw new ConflictException('No se puede eliminar la transferencia porque tiene movimientos asociados');
    }

    await this.prisma.transferenciaInventario.delete({
      where: { id }
    });
  }

  async getEstadisticas(tiendaId?: number): Promise<any> {
    const where: Prisma.TransferenciaInventarioWhereInput = {};

    if (tiendaId) {
      where.OR = [
        { origenTipo: 'FABRICA', origenId: tiendaId },
        { destinoTipo: 'FABRICA', destinoId: tiendaId },
        {
          OR: [
            {
              AND: [
                { origenTipo: 'SUCURSAL' },
                { origenId: tiendaId}
              ]
            },
            {
              AND: [
                { destinoTipo: 'SUCURSAL' },
                { origenId:tiendaId}
              ]
            }
          ]
        }
      ];
    }

    const [
      totalTransferencias,
      transferenciasPendientes,
      transferenciasCompletadas,
      transferenciasCanceladas,
      transferenciasEsteMes
    ] = await Promise.all([
      this.prisma.transferenciaInventario.count({ where }),
      this.prisma.transferenciaInventario.count({
        where: { ...where, estado: 'PENDIENTE' }
      }),
      this.prisma.transferenciaInventario.count({
        where: { ...where, estado: 'COMPLETADA' }
      }),
      this.prisma.transferenciaInventario.count({
        where: { ...where, estado: 'CANCELADA' }
      }),
      this.prisma.transferenciaInventario.count({
        where: {
          ...where,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      })
    ]);

    return {
      totalTransferencias,
      transferenciasPendientes,
      transferenciasCompletadas,
      transferenciasCanceladas,
      transferenciasEsteMes
    };
  }

  async getTransferenciasPorProducto(productoId: number): Promise<TransferenciaInventarioResponseDto[]> {
    const producto = await this.prisma.producto.findUnique({
      where: { id: productoId }
    });

    if (!producto) {
      throw new NotFoundException(`Producto con ID ${productoId} no encontrado`);
    }

    const transferencias = await this.prisma.transferenciaInventario.findMany({
      where: { productoId },
      include: {
        producto: {
          include: {
            categoria: true,
            imagenes: {
              take: 1,
              orderBy: { orden: 'asc' }
            }
          }
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        movimientos: {
          take: 3,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    // Obtener detalles de origen y destino para cada transferencia
    const transferenciasCompletas = await Promise.all(
      transferencias.map(async (transferencia) => {
        const [origen, destino] = await Promise.all([
          this.obtenerEntidadOrigen(transferencia.origenTipo, transferencia.origenId),
          this.obtenerEntidadDestino(transferencia.destinoTipo, transferencia.destinoId)
        ]);

        return new TransferenciaInventarioResponseDto({
          ...transferencia,
          origen,
          destino
        });
      })
    );

    return transferenciasCompletas;
  }
}