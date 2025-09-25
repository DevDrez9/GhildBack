import { Module } from '@nestjs/common';
import { SubcategoriaService } from './subcategoria.service';
import { SubcategoriaController } from './subcategoria.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [SubcategoriaController],
  providers: [SubcategoriaService,PrismaService],
})
export class SubcategoriaModule {}
