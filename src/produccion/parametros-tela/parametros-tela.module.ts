import { Module } from '@nestjs/common';
import { ParametrosTelaService } from './parametros-tela.service';
import { ParametrosTelaController } from './parametros-tela.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [ParametrosTelaController],
  providers: [ParametrosTelaService,PrismaService],
})
export class ParametrosTelaModule {}
