import { Module } from '@nestjs/common';

import { ActionLogModule } from './action-log/action-log.module';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { WorkflowModule } from './workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule, ActionLogModule],
  controllers: [HealthController],
})
export class AppModule {}
