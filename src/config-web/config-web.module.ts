import { Module } from '@nestjs/common';
import { ConfigWebService } from './config-web.service';
import { ConfigWebController } from './config-web.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [ConfigWebController],
  providers: [ConfigWebService,PrismaService],
})
export class ConfigWebModule {}
