import { Module } from '@nestjs/common';
import { TrabajosFinalizadosService } from './trabajos-finalizados.service';
import { TrabajosFinalizadosController } from './trabajos-finalizados.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [TrabajosFinalizadosController],
  providers: [TrabajosFinalizadosService,PrismaService],
})
export class TrabajosFinalizadosModule {}
