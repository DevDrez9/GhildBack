import { Module } from '@nestjs/common';
import { VentaService } from './venta.service';
import { VentaController } from './venta.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [VentaController],
  providers: [VentaService, PrismaService],
})
export class VentaModule {}
