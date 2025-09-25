import { Module } from '@nestjs/common';
import { TiendaService } from './tienda.service';
import { TiendaController } from './tienda.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [TiendaController],
  providers: [TiendaService,PrismaService],
})
export class TiendaModule {}
