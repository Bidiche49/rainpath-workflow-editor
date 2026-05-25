import {
  WorkflowSchema,
  type CreateWorkflowInput,
  type UpdateWorkflowInput,
  type Workflow,
} from '@rainpath/schemas';
import { z } from 'zod';

import { apiFetch } from './client';

const WorkflowListSchema = z.array(WorkflowSchema);

export function listWorkflows(): Promise<Workflow[]> {
  return apiFetch('/workflows', { method: 'GET' }, WorkflowListSchema);
}

export function getWorkflow(id: string): Promise<Workflow> {
  return apiFetch(`/workflows/${id}`, { method: 'GET' }, WorkflowSchema);
}

export function createWorkflow(payload: CreateWorkflowInput): Promise<Workflow> {
  return apiFetch('/workflows', { method: 'POST', body: JSON.stringify(payload) }, WorkflowSchema);
}

export function updateWorkflow(id: string, patch: UpdateWorkflowInput): Promise<Workflow> {
  return apiFetch(
    `/workflows/${id}`,
    { method: 'PATCH', body: JSON.stringify(patch) },
    WorkflowSchema,
  );
}

export function deleteWorkflow(id: string): Promise<void> {
  // The API replies 204 No Content; `z.void()` accepts the empty body.
  return apiFetch(`/workflows/${id}`, { method: 'DELETE' }, z.void());
}
