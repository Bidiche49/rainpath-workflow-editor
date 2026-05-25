import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import type { Workflow } from '@rainpath/schemas';

import { CreateWorkflowDto, UpdateWorkflowDto } from './dto';
import { WorkflowService } from './workflow.service';

@Controller('workflows')
export class WorkflowController {
  constructor(private readonly workflows: WorkflowService) {}

  @Post()
  create(@Body() dto: CreateWorkflowDto): Promise<Workflow> {
    return this.workflows.create(dto);
  }

  @Get()
  findAll(): Promise<Workflow[]> {
    return this.workflows.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Workflow> {
    return this.workflows.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWorkflowDto): Promise<Workflow> {
    return this.workflows.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string): Promise<void> {
    return this.workflows.remove(id);
  }
}
