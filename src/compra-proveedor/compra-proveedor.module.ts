import { Module } from '@nestjs/common';
import { CompraProveedorService } from './compra-proveedor.service';
import { CompraProveedorController } from './compra-proveedor.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [CompraProveedorController],
  providers: [CompraProveedorService,PrismaService],
})
export class CompraProveedorModule {}
