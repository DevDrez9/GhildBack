import { Module } from '@nestjs/common';
import { CarritoService } from './carrito.service';
import { CarritoController } from './carrito.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [CarritoController],
  providers: [CarritoService, PrismaService],
})
export class CarritoModule {}
