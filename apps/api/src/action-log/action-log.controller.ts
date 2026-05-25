import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import type { ActionLog } from '@rainpath/schemas';

import { ActionLogService } from './action-log.service';
import { CreateActionLogDto } from './dto';

@Controller('action-logs')
export class ActionLogController {
  constructor(private readonly actionLogs: ActionLogService) {}

  @Get()
  findByPatient(@Query('patientId') patientId?: string): Promise<ActionLog[]> {
    return this.actionLogs.findByPatient(patientId);
  }

  @Post()
  create(@Body() dto: CreateActionLogDto): Promise<ActionLog> {
    return this.actionLogs.create(dto);
  }
}
