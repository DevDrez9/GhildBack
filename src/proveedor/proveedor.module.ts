import { Module } from '@nestjs/common';
import { ProveedorService } from './proveedor.service';
import { ProveedorController } from './proveedor.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [ProveedorController],
  providers: [ProveedorService, PrismaService],
})
export class ProveedorModule {}
