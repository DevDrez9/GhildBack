import { Module } from '@nestjs/common';
import { CompraTelaItemService } from './compra-tela-item.service';
import { CompraTelaItemController } from './compra-tela-item.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [CompraTelaItemController],
  providers: [CompraTelaItemService,PrismaService],
})
export class CompraTelaItemModule {}
