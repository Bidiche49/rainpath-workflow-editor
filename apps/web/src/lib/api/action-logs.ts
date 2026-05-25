import { ActionLogSchema, type ActionLog, type CreateActionLogInput } from '@rainpath/schemas';
import { z } from 'zod';

import { apiFetch } from './client';

const ActionLogListSchema = z.array(ActionLogSchema);

/** Every action log, newest first (the API omits the `patientId` filter). */
export function listAllActionLogs(): Promise<ActionLog[]> {
  return apiFetch('/action-logs', { method: 'GET' }, ActionLogListSchema);
}

export function listActionLogs(patientId: string): Promise<ActionLog[]> {
  const query = new URLSearchParams({ patientId }).toString();
  return apiFetch(`/action-logs?${query}`, { method: 'GET' }, ActionLogListSchema);
}

export function createActionLog(payload: CreateActionLogInput): Promise<ActionLog> {
  return apiFetch(
    '/action-logs',
    { method: 'POST', body: JSON.stringify(payload) },
    ActionLogSchema,
  );
}
