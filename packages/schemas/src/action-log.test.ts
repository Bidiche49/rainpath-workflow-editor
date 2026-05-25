import { describe, expect, it } from 'vitest';

import { ActionLogSchema, ExecutionStateSchema } from './action-log';

describe('ActionLogSchema', () => {
  it('parses a valid action log', () => {
    const parsed = ActionLogSchema.parse({
      id: 'log_1',
      patientId: 'p_1',
      workflowId: 'wf_1',
      nodeId: 'n_1',
      channel: 'email',
      status: 'sent',
      notifiedTo: 'secretariat@lab.fr',
      occurredAt: '2026-05-25T09:00:00.000Z',
    });

    expect(parsed.occurredAt).toBeInstanceOf(Date);
    expect(parsed.channel).toBe('email');
  });

  it('rejects a non-channel type', () => {
    const result = ActionLogSchema.safeParse({
      id: 'log_2',
      patientId: 'p_1',
      workflowId: 'wf_1',
      nodeId: 'n_1',
      channel: 'wait',
      status: 'sent',
      occurredAt: new Date(),
    });

    expect(result.success).toBe(false);
  });
});

describe('ExecutionStateSchema', () => {
  it('parses a blocked patient with a current node', () => {
    const parsed = ExecutionStateSchema.parse({
      workflowId: 'wf_1',
      patientId: 'p_1',
      currentNodeId: 'n_3',
      status: 'blocked',
    });

    expect(parsed.visitedNodeIds).toEqual([]);
    expect(parsed.currentNodeId).toBe('n_3');
  });

  it('accepts a null currentNodeId for a completed patient', () => {
    const result = ExecutionStateSchema.safeParse({
      workflowId: 'wf_1',
      patientId: 'p_1',
      currentNodeId: null,
      status: 'completed',
      visitedNodeIds: ['s', 'e'],
    });

    expect(result.success).toBe(true);
  });
});
