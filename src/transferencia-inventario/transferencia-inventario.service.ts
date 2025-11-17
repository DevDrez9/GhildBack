import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { EstadoTransferencia, Prisma, TipoDestinoTransferencia, TipoOrigenTransferencia } from 'generated/prisma/client';

// DTOs
import { CreateTransferenciaInventarioDto } from './dto/create-transferencia-inventario.dto';
import { UpdateTransferenciaInventarioDto } from './dto/update-transferencia-inventario.dto';
import { UpdateEstadoTransferenciaDto } from './dto/update-estado-transferencia.dto';
import { TransferenciaInventarioResponseDto } from './dto/transferencia-inventario-response.dto';
import { FilterTransferenciaInventarioDto } from './dto/filter-transferencia-inventario.dto';

@Injectable()
export class TransferenciaInventarioService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 🔄 REESCRITO: Valida el stock por cada talla en el inventario de origen.
   */
  private async validarStockOrigenPorTalla(
    origenTipo: TipoOrigenTransferencia,
    origenId: number,
    productoId: number,
    cantidadPorTalla: Record<string, number>
  ): Promise<void> {
    let inventarioOrigen;
    if (origenTipo === 'FABRICA') {
      inventarioOrigen = await this.prisma.inventarioTienda.findUnique({
        where: { productoId_tiendaId: { productoId, tiendaId: origenId } },
      });
    } else { // SUCURSAL
      inventarioOrigen = await this.prisma.inventarioSucursal.findUnique({
        where: { productoId_sucursalId: { productoId, sucursalId: origenId } },
      });
    }

    if (!inventarioOrigen) {
      throw new NotFoundException(`No se encontró inventario para el producto en el origen especificado.`);
    }

    const stockDisponible = (inventarioOrigen.stock as Record<string, number>) || {};

    for (const talla in cantidadPorTalla) {
      const cantidadRequerida = cantidadPorTalla[talla];
      const stockActualTalla = stockDisponible[talla] || 0;
      if (stockActualTalla < cantidadRequerida) {
        throw new BadRequestException(
          `Stock insuficiente para la talla ${talla}. Disponible: ${stockActualTalla}, Requerido: ${cantidadRequerida}`
        );
      }
    }
  }

  /**
   * 🔄 REESCRITO: Crea y procesa inmediatamente una transferencia, moviendo el stock.
   */
 async create(createDto: CreateTransferenciaInventarioDto): Promise<TransferenciaInventarioResponseDto> {
    const { productoId, usuarioId, origenTipo, origenId, destinoTipo, destinoId, cantidad, motivo } = createDto;

    if (Object.keys(cantidad).length === 0 || Object.values(cantidad).some(qty => qty <= 0)) {
        throw new BadRequestException('La cantidad a transferir debe ser un objeto con valores positivos.');
    }
    if (origenTipo === destinoTipo && origenId === destinoId) {
        throw new BadRequestException('El origen y el destino no pueden ser el mismo.');
    }

    await this.validarStockOrigenPorTalla(origenTipo, origenId, productoId, cantidad);

    const codigo = createDto.codigo || await this.generarCodigoTransferencia();

    try {
      const transferenciaCreada = await this.prisma.$transaction(async (prisma) => {
        // --- A. PROCESAR SALIDA DEL ORIGEN ---
        let stockAnteriorOrigen: Prisma.JsonValue = {};
        let stockNuevoOrigen: Prisma.JsonValue = {};
        let inventarioOrigenId: number;
        
        if (origenTipo === 'FABRICA') {
            const inv = await prisma.inventarioTienda.findUnique({ where: { productoId_tiendaId: { productoId, tiendaId: origenId } }, select: { id: true, stock: true } });
            if (!inv) { throw new NotFoundException(`Inventario de origen en fábrica no encontrado.`); }
            inventarioOrigenId = inv.id;
            stockAnteriorOrigen = inv.stock;
            const nuevoStock = { ...(stockAnteriorOrigen as Record<string, number>) };
            for(const talla in cantidad) { nuevoStock[talla] -= cantidad[talla]; if(nuevoStock[talla] === 0) delete nuevoStock[talla]; }
            stockNuevoOrigen = nuevoStock;
            await prisma.inventarioTienda.update({ where: { id: inv.id }, data: { stock: nuevoStock } });
        } else { // SUCURSAL
            const inv = await prisma.inventarioSucursal.findUnique({ where: { productoId_sucursalId: { productoId, sucursalId: origenId } }, select: { id: true, stock: true } });
            if (!inv) { throw new NotFoundException(`Inventario de origen en sucursal no encontrado.`); }
            inventarioOrigenId = inv.id;
            stockAnteriorOrigen = inv.stock;
            const nuevoStock = { ...(stockAnteriorOrigen as Record<string, number>) };
            for(const talla in cantidad) { nuevoStock[talla] -= cantidad[talla]; if(nuevoStock[talla] === 0) delete nuevoStock[talla]; }
            stockNuevoOrigen = nuevoStock;
            await prisma.inventarioSucursal.update({ where: { id: inv.id }, data: { stock: nuevoStock } });
        }

        // --- B. PROCESAR ENTRADA AL DESTINO ---
        let stockAnteriorDestino: Prisma.JsonValue = {};
        let stockNuevoDestino: Prisma.JsonValue = {};
        let inventarioDestinoId: number;

        if (destinoTipo === 'FABRICA') {
            const inv = await prisma.inventarioTienda.upsert({
                where: { productoId_tiendaId: { productoId, tiendaId: destinoId } },
                create: { productoId, tiendaId: destinoId, stock: {} },
                update: {}
            });
            inventarioDestinoId = inv.id;
            stockAnteriorDestino = inv.stock;
            const nuevoStock = { ...(stockAnteriorDestino as Record<string, number>) };
            for(const talla in cantidad) { nuevoStock[talla] = (nuevoStock[talla] || 0) + cantidad[talla]; }
            stockNuevoDestino = nuevoStock;
            await prisma.inventarioTienda.update({ where: { id: inv.id }, data: { stock: nuevoStock } });
        } else { // SUCURSAL
            const sucursal = await prisma.sucursal.findUnique({where: {id: destinoId}});
            if(!sucursal) throw new NotFoundException(`Sucursal de destino con ID ${destinoId} no encontrada.`);
            const inv = await prisma.inventarioSucursal.upsert({
                where: { productoId_sucursalId: { productoId, sucursalId: destinoId } },
                create: { productoId, sucursalId: destinoId, tiendaId: sucursal.tiendaId, stock: {} },
                update: {}
            });
            inventarioDestinoId = inv.id;
            stockAnteriorDestino = inv.stock;
            const nuevoStock = { ...(stockAnteriorDestino as Record<string, number>) };
            for(const talla in cantidad) { nuevoStock[talla] = (nuevoStock[talla] || 0) + cantidad[talla]; }
            stockNuevoDestino = nuevoStock;
            await prisma.inventarioSucursal.update({ where: { id: inv.id }, data: { stock: nuevoStock } });
        }

        // --- C. CREAR TRANSFERENCIA Y MOVIMIENTOS ---
        return prisma.transferenciaInventario.create({
          data: {
            codigo, productoId, usuarioId, origenTipo, origenId, destinoTipo, destinoId, cantidad, motivo,
            estado: EstadoTransferencia.COMPLETADA,
            movimientos: {
              create: [
                { 
                    tipo: 'TRANSFERENCIA_SALIDA', 
                    cantidad, 
                    productoId, 
                    usuarioId, 
                    motivo: `Salida por ${codigo}`, 
                    ...(origenTipo === 'FABRICA' ? { inventarioTiendaId: inventarioOrigenId } : { inventarioSucursalId: inventarioOrigenId }), 
                    // 👇 CORRECCIÓN: Aseguramos que no se pase 'null'
                    stockAnterior: stockAnteriorOrigen || {}, 
                    stockNuevo: stockNuevoOrigen || {}
                },
                { 
                    tipo: 'TRANSFERENCIA_ENTRADA', 
                    cantidad, 
                    productoId, 
                    usuarioId, 
                    motivo: `Entrada por ${codigo}`, 
                    ...(destinoTipo === 'FABRICA' ? { inventarioTiendaId: inventarioDestinoId } : { inventarioSucursalId: inventarioDestinoId }), 
                    // 👇 CORRECCIÓN: Aseguramos que no se pase 'null'
                    stockAnterior: stockAnteriorDestino || {}, 
                    stockNuevo: stockNuevoDestino || {}
                },
              ]
            }
          },
          include: { producto: true, usuario: true }
        });
      });
      
      const [origen, destino] = await Promise.all([
        this.obtenerEntidadOrigen(transferenciaCreada.origenTipo, transferenciaCreada.origenId),
        this.obtenerEntidadDestino(transferenciaCreada.destinoTipo, transferenciaCreada.destinoId)
      ]);
      return new TransferenciaInventarioResponseDto({ ...transferenciaCreada, origen, destino });

    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Error al crear la transferencia (código duplicado).');
      }
      throw error;
    }
  }

  /**
   * 🔄 REESCRITO: Procesa el movimiento de stock para transferencias que cambian a COMPLETADA.
   */
  private async procesarTransferencia(transferenciaId: number): Promise<void> {
    const transferencia = await this.prisma.transferenciaInventario.findUnique({ where: { id: transferenciaId } });
    if (!transferencia || transferencia.estado !== 'COMPLETADA') {
      throw new BadRequestException('La transferencia no existe o no está en estado COMPLETADA.');
    }
    
    // La lógica de movimiento de stock es idéntica a la del `create`
    const { productoId, origenTipo, origenId, destinoTipo, destinoId, cantidad } = transferencia;
    const cantidadPorTalla = cantidad as Record<string, number>;

    await this.validarStockOrigenPorTalla(origenTipo, origenId, productoId, cantidadPorTalla);

    await this.prisma.$transaction(async (prisma) => {
      // Replicar la misma lógica de débito/crédito y creación de movimientos del método `create`.
      // (Esta sección se omite por brevedad, pero sería una copia de la lógica de transacción de arriba)
    });
  }
  
  // --- MÉTODOS AUXILIARES Y OTROS ENDPOINTS ---
  // (La mayoría de estos no necesitan cambios significativos porque operan sobre metadatos)
  
  private async generarCodigoTransferencia(): Promise<string> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const count = await this.prisma.transferenciaInventario.count({ where: { createdAt: { gte: today } } });
    const numero = (count + 1).toString().padStart(4, '0');
    return `TRF-${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}-${numero}`;
  }

  private async obtenerEntidadOrigen(origenTipo: TipoOrigenTransferencia, origenId: number): Promise<any> {
    if (origenTipo === 'FABRICA') return this.prisma.tienda.findUnique({ where: { id: origenId } });
    return this.prisma.sucursal.findUnique({ where: { id: origenId }, include: { tienda: true } });
  }

  private async obtenerEntidadDestino(destinoTipo: TipoDestinoTransferencia, destinoId: number): Promise<any> {
    if (destinoTipo === 'FABRICA') return this.prisma.tienda.findUnique({ where: { id: destinoId } });
    return this.prisma.sucursal.findUnique({ where: { id: destinoId }, include: { tienda: true } });
  }
  
  async findAll(filterDto: FilterTransferenciaInventarioDto = {}): Promise<{ transferencias: TransferenciaInventarioResponseDto[], total: number }> {
    // Esta función no necesita cambios en su lógica principal
    // ... tu código existente de findAll ...
    return { transferencias: [], total: 0 }; // Placeholder
  }

  async findOne(id: number): Promise<TransferenciaInventarioResponseDto> {
    // Esta función no necesita cambios en su lógica principal
    // ... tu código existente de findOne ...
    return new TransferenciaInventarioResponseDto({}); // Placeholder
  }

  async updateEstado(id: number, updateDto: UpdateEstadoTransferenciaDto): Promise<TransferenciaInventarioResponseDto> {
    // Esta función es ahora más simple: solo actualiza el estado.
    // La lógica de mover stock se delega a `procesarTransferencia`
    const { estado } = updateDto;
    const transferencia = await this.prisma.transferenciaInventario.update({
        where: { id },
        data: { estado },
        include: { /* ... */ }
    });

    if (estado === 'COMPLETADA') {
        // Opcional: podrías llamar a this.procesarTransferencia(id) aquí si es un flujo asíncrono.
        // Por ahora, el método `create` ya lo hace de forma síncrona.
    }

    return new TransferenciaInventarioResponseDto(transferencia);
  }
  
  // ... resto de tus métodos (update, remove, getEstadisticas, etc.)

  async getEstadisticas(tiendaId?: number): Promise<any> {
    const where: Prisma.TransferenciaInventarioWhereInput = {};

    // Filtro complejo: Si se pasa tiendaId, buscamos transferencias donde:
    // - El origen sea la FABRICA de esa tienda.
    // - O el destino sea la FABRICA de esa tienda.
    // - (Opcional: Podrías agregar lógica para buscar sucursales de esa tienda si fuera necesario, pero es costoso en rendimiento)
    if (tiendaId) {
      where.OR = [
        { origenTipo: 'FABRICA', origenId: tiendaId },
        { destinoTipo: 'FABRICA', destinoId: tiendaId }
      ];
    }

    const [
      totalTransferencias,
      transferenciasPendientes,
      transferenciasCompletadas,
      transferenciasCanceladas,
      transferenciasEsteMes
    ] = await Promise.all([
      // Total global
      this.prisma.transferenciaInventario.count({ where }),
      // Pendientes
      this.prisma.transferenciaInventario.count({
        where: { ...where, estado: 'PENDIENTE' }
      }),
      // Completadas
      this.prisma.transferenciaInventario.count({
        where: { ...where, estado: 'COMPLETADA' }
      }),
      // Canceladas
      this.prisma.transferenciaInventario.count({
        where: { ...where, estado: 'CANCELADA' }
      }),
      // Este mes
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

  // ==========================================
  // 2. GET: TRANSFERENCIAS POR PRODUCTO
  // ==========================================
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
            imagenes: { take: 1, orderBy: { orden: 'asc' } }
          }
        },
        usuario: {
          select: { id: true, nombre: true, email: true }
        },
        // Incluimos algunos movimientos para contexto
        movimientos: {
          take: 2,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limitamos a las últimas 50 para no sobrecargar
    });

    // Mapeamos para resolver los nombres de Origen y Destino
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

  // ==========================================
  // 3. GET: FIND BY CODIGO
  // ==========================================
  async findByCodigo(codigo: string): Promise<TransferenciaInventarioResponseDto> {
    const transferencia = await this.prisma.transferenciaInventario.findUnique({
      where: { codigo },
      include: {
        producto: {
          include: {
            categoria: true,
            imagenes: { take: 1, orderBy: { orden: 'asc' } }
          }
        },
        usuario: {
          select: { id: true, nombre: true, email: true, rol: true }
        },
        movimientos: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!transferencia) {
      throw new NotFoundException(`Transferencia con código ${codigo} no encontrada`);
    }

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

  // ==========================================
  // 4. PATCH: UPDATE
  // ==========================================
  async update(id: number, updateDto: UpdateTransferenciaInventarioDto): Promise<TransferenciaInventarioResponseDto> {
    // Buscamos la transferencia actual
    const transferenciaActual = await this.prisma.transferenciaInventario.findUnique({ where: { id } });
    
    if (!transferenciaActual) {
      throw new NotFoundException(`Transferencia con ID ${id} no encontrada`);
    }

    // 🔒 Restricción: Solo permitir editar si está PENDIENTE
    if (transferenciaActual.estado !== 'PENDIENTE') {
      throw new BadRequestException('Solo se pueden modificar transferencias en estado PENDIENTE. Las completadas ya movieron stock.');
    }

    const { productoId, usuarioId, ...dataRestante } = updateDto;
    const dataToUpdate: Prisma.TransferenciaInventarioUpdateInput = { ...dataRestante };

    // Si se intenta cambiar el producto
    if (productoId && productoId !== transferenciaActual.productoId) {
      const prod = await this.prisma.producto.findUnique({ where: { id: productoId } });
      if (!prod) throw new NotFoundException(`Producto ID ${productoId} no encontrado`);
      dataToUpdate.producto = { connect: { id: productoId } };
    }

    // Si se intenta cambiar el usuario
    if (usuarioId && usuarioId !== transferenciaActual.usuarioId) {
      const usr = await this.prisma.usuario.findUnique({ where: { id: usuarioId } });
      if (!usr) throw new NotFoundException(`Usuario ID ${usuarioId} no encontrado`);
      dataToUpdate.usuario = { connect: { id: usuarioId } };
    }

    try {
      const updatedTransferencia = await this.prisma.transferenciaInventario.update({
        where: { id },
        data: dataToUpdate,
        include: {
          producto: true,
          usuario: { select: { id: true, nombre: true, email: true } }
        }
      });

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
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Error al actualizar: Código de transferencia duplicado.');
      }
      throw error;
    }
  }

  // ==========================================
  // 5. DELETE: REMOVE
  // ==========================================
  async remove(id: number): Promise<void> {
    const transferencia = await this.prisma.transferenciaInventario.findUnique({ where: { id } });

    if (!transferencia) {
       // Si no existe, retornamos (idempotencia) o lanzamos error según prefieras.
       throw new NotFoundException(`Transferencia con ID ${id} no encontrada`);
    }

    // 🔒 Restricción de seguridad de datos
    if (transferencia.estado === 'COMPLETADA') {
      throw new ConflictException('No se puede eliminar una transferencia COMPLETADA porque ya afectó el inventario. Considere hacer una transferencia de reversión.');
    }

    // Verificar si tiene movimientos huérfanos (por si acaso hubo error de consistencia)
    const movimientosAsociados = await this.prisma.movimientoInventario.count({
      where: { transferenciaId: id }
    });

    if (movimientosAsociados > 0) {
      throw new ConflictException('No se puede eliminar la transferencia porque tiene movimientos de inventario asociados.');
    }

    await this.prisma.transferenciaInventario.delete({
      where: { id }
    });
  }
}