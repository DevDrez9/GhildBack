import { Module } from '@nestjs/common';
import { TrabajosService } from './trabajos.service';
import { TrabajosController } from './trabajos.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [TrabajosController],
  providers: [TrabajosService,PrismaService],
})
export class TrabajosModule {}
