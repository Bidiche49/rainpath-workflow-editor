import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Workflow as PrismaWorkflow } from '@prisma/client';
import {
  LATEST_SCHEMA_VERSION,
  WorkflowSettingsSchema,
  migrateGraph,
  type CreateWorkflowInput,
  type UpdateWorkflowInput,
  type Workflow,
} from '@rainpath/schemas';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkflowService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateWorkflowInput): Promise<Workflow> {
    const row = await this.prisma.workflow.create({
      data: {
        name: input.name,
        ...(input.description !== undefined ? { description: input.description } : {}),
        schemaVersion: LATEST_SCHEMA_VERSION,
        graph: input.graph as unknown as Prisma.InputJsonValue,
        settings: input.settings as unknown as Prisma.InputJsonValue,
      },
    });
    return this.toWorkflow(row);
  }

  async findAll(): Promise<Workflow[]> {
    const rows = await this.prisma.workflow.findMany({ orderBy: { updatedAt: 'desc' } });
    return rows.map((row) => this.toWorkflow(row));
  }

  async findOne(id: string): Promise<Workflow> {
    const row = await this.prisma.workflow.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException(`Workflow ${id} introuvable`);
    }
    return this.toWorkflow(row);
  }

  async update(id: string, input: UpdateWorkflowInput): Promise<Workflow> {
    await this.findOne(id);
    const row = await this.prisma.workflow.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.graph !== undefined
          ? { graph: input.graph as unknown as Prisma.InputJsonValue }
          : {}),
        ...(input.settings !== undefined
          ? { settings: input.settings as unknown as Prisma.InputJsonValue }
          : {}),
      },
    });
    return this.toWorkflow(row);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.workflow.delete({ where: { id } });
  }

  /**
   * Map a stored row to the canonical {@link Workflow} shape.
   *
   * Read path per ADR-002: the JSON `graph` column is migrated to the latest
   * schema version then parsed; `settings` is validated by its own schema. A
   * row that fails validation throws — corrupt data never leaks out untyped.
   */
  private toWorkflow(row: PrismaWorkflow): Workflow {
    return {
      id: row.id,
      name: row.name,
      ...(row.description !== null ? { description: row.description } : {}),
      schemaVersion: row.schemaVersion,
      graph: migrateGraph(row.graph, row.schemaVersion),
      settings: WorkflowSettingsSchema.parse(row.settings),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
