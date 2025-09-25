import { Module } from '@nestjs/common';
import { InventarioSucursalService } from './inventario-sucursal.service';
import { InventarioSucursalController } from './inventario-sucursal.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [InventarioSucursalController],
  providers: [InventarioSucursalService,PrismaService],
})
export class InventarioSucursalModule {}
