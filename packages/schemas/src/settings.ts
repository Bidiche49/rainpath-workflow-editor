import { z } from 'zod';

/**
 * Workflow-level settings, persisted as a JSON column on `Workflow`.
 *
 * `notificationEmail` is the default secretariat inbox notified on every
 * channel action; individual nodes may override it (see ADR-004).
 */
export const WorkflowSettingsSchema = z.object({
  notificationEmail: z.string().email(),
});
export type WorkflowSettings = z.infer<typeof WorkflowSettingsSchema>;
