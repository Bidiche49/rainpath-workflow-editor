import { Injectable } from '@nestjs/common';
import type { ActionLog as PrismaActionLog } from '@prisma/client';
import { ActionLogSchema, type ActionLog, type CreateActionLogInput } from '@rainpath/schemas';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActionLogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateActionLogInput): Promise<ActionLog> {
    const row = await this.prisma.actionLog.create({
      data: {
        patientId: input.patientId,
        workflowId: input.workflowId,
        nodeId: input.nodeId,
        channel: input.channel,
        status: input.status,
        ...(input.message !== undefined ? { message: input.message } : {}),
        ...(input.notifiedTo !== undefined ? { notifiedTo: input.notifiedTo } : {}),
        ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
      },
    });
    return this.toActionLog(row);
  }

  /** All logs, optionally scoped to a single patient, newest first. */
  async findByPatient(patientId?: string): Promise<ActionLog[]> {
    const rows = await this.prisma.actionLog.findMany({
      ...(patientId !== undefined ? { where: { patientId } } : {}),
      orderBy: { occurredAt: 'desc' },
    });
    return rows.map((row) => this.toActionLog(row));
  }

  /** Validate a stored row against the canonical schema (channel/status enums). */
  private toActionLog(row: PrismaActionLog): ActionLog {
    return ActionLogSchema.parse({
      id: row.id,
      patientId: row.patientId,
      workflowId: row.workflowId,
      nodeId: row.nodeId,
      channel: row.channel,
      status: row.status,
      ...(row.message !== null ? { message: row.message } : {}),
      ...(row.notifiedTo !== null ? { notifiedTo: row.notifiedTo } : {}),
      occurredAt: row.occurredAt,
    });
  }
}
