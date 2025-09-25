import { Module } from '@nestjs/common';
import { ParametrosFisicosTelaService } from './parametros-fisicos-tela.service';
import { ParametrosFisicosTelaController } from './parametros-fisicos-tela.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [ParametrosFisicosTelaController],
  providers: [ParametrosFisicosTelaService,PrismaService],
})
export class ParametrosFisicosTelaModule {}
