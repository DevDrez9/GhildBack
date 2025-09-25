import { Module } from '@nestjs/common';
import { SucursalService } from './sucursal.service';
import { SucursalController } from './sucursal.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [SucursalController],
  providers: [SucursalService, PrismaService],
})
export class SucursalModule {}
