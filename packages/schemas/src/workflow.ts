import { z } from 'zod';

import { WorkflowGraphSchema } from './graph';
import { WorkflowSettingsSchema } from './settings';

/** Current canonical graph schema version (see ADR-002 + ./migrations). */
export const LATEST_SCHEMA_VERSION = 1;

/**
 * A complete workflow entity as stored and returned by the API.
 *
 * `graph` and `settings` are JSON columns validated by their own schemas.
 * `schemaVersion` enables forward migration of stored graphs.
 */
export const WorkflowSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  schemaVersion: z.number().int().positive().default(LATEST_SCHEMA_VERSION),
  graph: WorkflowGraphSchema,
  settings: WorkflowSettingsSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Workflow = z.infer<typeof WorkflowSchema>;

/** Payload accepted when creating a workflow (server assigns id/timestamps). */
export const CreateWorkflowSchema = WorkflowSchema.pick({
  name: true,
  description: true,
  graph: true,
  settings: true,
}).partial({ description: true });
export type CreateWorkflowInput = z.infer<typeof CreateWorkflowSchema>;

/** Payload accepted when patching a workflow: every field optional. */
export const UpdateWorkflowSchema = CreateWorkflowSchema.partial();
export type UpdateWorkflowInput = z.infer<typeof UpdateWorkflowSchema>;
