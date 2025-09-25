import { Module } from '@nestjs/common';
import { TransferenciaInventarioService } from './transferencia-inventario.service';
import { TransferenciaInventarioController } from './transferencia-inventario.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [TransferenciaInventarioController],
  providers: [TransferenciaInventarioService,PrismaService],
})
export class TransferenciaInventarioModule {}
