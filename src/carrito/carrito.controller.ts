import { Controller, Post, Body, Param, Get, Patch, UsePipes, ValidationPipe, UseGuards, Req, Query, Delete, HttpCode, HttpStatus, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { CarritoService } from './carrito.service';
import { CreateCarritoDto, CreateCarritoItemDto } from './dto/create-carrito.dto';
import { CarritoResponseDto } from './dto/carrito-response.dto';
import { FilterCarritoDto } from './dto/filter-carrito.dto';
// Importa tu Guard de autenticación y DTOs

// Simulación de obtener el ID del usuario/cliente desde el token
const DUMMY_CLIENT_ID = 1; 

@Controller('carritos')
export class CarritoController {
    constructor(private readonly carritoService: CarritoService) {}

    // ----------------------------------------------------------------
    // 1. CREAR / OBTENER Carrito (Endpoint principal)
    // POST /carritos
    // ----------------------------------------------------------------
    @Post()
    // @UseGuards(JwtAuthGuard) // Usarías tu guardia de autenticación aquí
    async create(
        @Body() createCarritoDto: CreateCarritoDto,
        
    ): Promise<CarritoResponseDto> {
        
        
        return this.carritoService.createOrFind( createCarritoDto);
    }

    // ----------------------------------------------------------------
    // 2. AGREGAR ÍTEMS al Carrito (Carrito debe estar en estado 'nuevo')
    // POST /carritos/:id/items
    // ----------------------------------------------------------------
    @Post(':id/items')
    async addItem(
        @Param('id') id: string,
        @Body() itemDto: CreateCarritoItemDto
    ): Promise<CarritoResponseDto> {
        return this.carritoService.addItem(+id, itemDto);
    }

    // ----------------------------------------------------------------
    // 3. FINALIZAR COMPRA (Cambia estado a 'pendiente')
    // PATCH /carritos/:id/checkout
    // ----------------------------------------------------------------
    @Patch(':id/checkout')
    async checkout(@Param('id') id: string): Promise<CarritoResponseDto> {
        return this.carritoService.checkout(+id);
    }
    @Patch(':id/checkout-pagado')
    async checkoutPagado(@Param('id') id: string): Promise<CarritoResponseDto> {
        return this.carritoService.checkoutPagado(+id);
    }

    // ----------------------------------------------------------------
    // 4. TERMINAR COMPRA (Cambia estado a 'terminado')
    // PATCH /carritos/:id/complete
    // NOTA: Este endpoint se usaría internamente, p. ej., por un webhook de pago.
    // ----------------------------------------------------------------
    @Patch(':id/complete')
    async complete(@Param('id') id: string): Promise<CarritoResponseDto> {
        return this.carritoService.complete(+id);
    }


    @Patch(':id/cancelado')
    async cancelado(@Param('id') id: string): Promise<CarritoResponseDto> {
        return this.carritoService.cancelar(+id);
    }

    // ----------------------------------------------------------------
    // 5. OBTENER Carrito por ID
    // GET /carritos/:id
    // ----------------------------------------------------------------
    @Get(':id')
    async findOne(@Param('id') id: string): Promise<CarritoResponseDto> {
        return this.carritoService.findOne(+id);
    }

    @Get(':clienteId/cliente') 
    async findCarritosByCliente(
       @Param('clienteId') clienteId: string
    ): Promise<CarritoResponseDto[]> {
       
        
        return this.carritoService.findByClienteId(+clienteId);
    }


     @Get('tienda/:tiendaId') 
    // @UseGuards(AdminOrEmployeeGuard) // 💡 Proteger con un Guard de rol
    async findCarritosTienda(
        @Query() filterDto: FilterCarritoDto,
       @Param('tiendaId') tiendaId: string
    ): Promise<CarritoResponseDto[]> {
       
  
        return this.carritoService.findCarritosByTiendaAndState(+tiendaId, filterDto.estado);
    }


     @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT) // 204 No Content para borrado exitoso
    async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
        try {
            await this.carritoService.deleteCarrito(id);
        } catch (error) {
            // Manejar si el carrito no existe (P4004 es el código de error de Prisma para 'no encontrado')
            if (error.code === 'P2025' || error.message.includes('No Carrito found')) { 
                 throw new NotFoundException(`Carrito con ID ${id} no encontrado.`);
            }
            
            throw error;
        }
    }


    // RUTA para borrar un ítem específico: DELETE /carritos/item/:itemId
    @Delete('item/:itemId')
    @HttpCode(HttpStatus.NO_CONTENT) // 204 No Content para borrado exitoso
    async deleteItem(@Param('itemId', ParseIntPipe) itemId: number): Promise<void> {
        try {
            await this.carritoService.deleteItemFromCarrito(itemId);
        } catch (error) {
            if (error.code === 'P2025' || error.message.includes('No CarritoItem found')) {
                 throw new NotFoundException(`Ítem de carrito con ID ${itemId} no encontrado.`);
            }
            throw error;
        }
    }

}