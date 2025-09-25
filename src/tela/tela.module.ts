import { Module } from '@nestjs/common';
import { TelaService } from './tela.service';
import { TelaController } from './tela.controller';
import { PrismaService } from 'src/prisma.service';


@Module({
  controllers: [TelaController],
  providers: [TelaService,PrismaService],
})
export class TelaModule {}
