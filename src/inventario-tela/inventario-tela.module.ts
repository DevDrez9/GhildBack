import { Module } from '@nestjs/common';
import { InventarioTelaService } from './inventario-tela.service';
import { InventarioTelaController } from './inventario-tela.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [InventarioTelaController],
  providers: [InventarioTelaService, PrismaService],
})
export class InventarioTelaModule {}
