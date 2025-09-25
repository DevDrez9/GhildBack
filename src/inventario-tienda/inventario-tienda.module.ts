import { Module } from '@nestjs/common';
import { InventarioTiendaService } from './inventario-tienda.service';
import { InventarioTiendaController } from './inventario-tienda.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [InventarioTiendaController],
  providers: [InventarioTiendaService,PrismaService],
})
export class InventarioTiendaModule {}
