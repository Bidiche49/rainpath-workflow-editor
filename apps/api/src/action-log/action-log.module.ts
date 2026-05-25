import { Module } from '@nestjs/common';

import { ActionLogController } from './action-log.controller';
import { ActionLogService } from './action-log.service';

@Module({
  controllers: [ActionLogController],
  providers: [ActionLogService],
})
export class ActionLogModule {}
