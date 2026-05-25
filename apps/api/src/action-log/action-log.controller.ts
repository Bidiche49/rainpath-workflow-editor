import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import type { ActionLog } from '@rainpath/schemas';

import { ActionLogService } from './action-log.service';
import { CreateActionLogDto, UpdateActionLogDto } from './dto';

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

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateActionLogDto): Promise<ActionLog> {
    return this.actionLogs.update(id, dto);
  }
}
