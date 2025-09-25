import { Module } from '@nestjs/common';
import { CostureroService } from './costurero.service';
import { CostureroController } from './costurero.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [CostureroController],
  providers: [CostureroService,PrismaService],
})
export class CostureroModule {}
