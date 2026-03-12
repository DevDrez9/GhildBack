import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ActivityLogService } from './activity-log.service';

@Module({
    providers: [ActivityLogService, PrismaService],
    exports: [ActivityLogService]
})
export class ActivityLogModule { }
