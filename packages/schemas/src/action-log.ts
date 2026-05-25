import { z } from 'zod';

import { ChannelNodeTypeSchema } from './graph';

/**
 * A single simulated relance event. No real message is ever sent within this
 * project's scope; every "send" is persisted here instead (see ARCHITECTURE
 * notes transverses).
 */
export const ActionStatusSchema = z.enum(['pending', 'sent', 'failed', 'skipped']);
export type ActionStatus = z.infer<typeof ActionStatusSchema>;

export const ActionLogSchema = z.object({
  id: z.string().min(1),
  patientId: z.string().min(1),
  workflowId: z.string().min(1),
  nodeId: z.string().min(1),
  channel: ChannelNodeTypeSchema,
  status: ActionStatusSchema,
  message: z.string().optional(),
  notifiedTo: z.string().email().optional(),
  occurredAt: z.coerce.date(),
});
export type ActionLog = z.infer<typeof ActionLogSchema>;

/**
 * Payload accepted when recording a simulated relance: the server assigns the
 * `id` and defaults `occurredAt` to "now" when omitted.
 */
export const CreateActionLogSchema = ActionLogSchema.omit({ id: true }).partial({
  occurredAt: true,
});
export type CreateActionLogInput = z.infer<typeof CreateActionLogSchema>;

/** Aggregate progression status of a patient through a workflow. */
export const PatientStatusSchema = z.enum(['pending', 'in_progress', 'blocked', 'completed']);
export type PatientStatus = z.infer<typeof PatientStatusSchema>;

/**
 * Runtime progression of a patient inside a workflow. Drives node highlighting
 * in the read-only preview and the "Simuler l'étape suivante" action.
 */
export const ExecutionStateSchema = z.object({
  workflowId: z.string().min(1),
  patientId: z.string().min(1),
  currentNodeId: z.string().min(1).nullable(),
  status: PatientStatusSchema,
  visitedNodeIds: z.array(z.string().min(1)).default([]),
});
export type ExecutionState = z.infer<typeof ExecutionStateSchema>;
