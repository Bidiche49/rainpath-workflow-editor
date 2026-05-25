import { Module } from '@nestjs/common';

import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { WorkflowModule } from './workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [HealthController],
})
export class AppModule {}
