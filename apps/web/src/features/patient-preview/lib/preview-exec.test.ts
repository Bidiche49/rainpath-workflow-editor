import type { ActionLog, ChannelNodeType, WorkflowGraph } from '@rainpath/schemas';
import { describe, expect, it } from 'vitest';

import { computeCurrentNodeId, computeNextStep, computeNodeStatuses } from './preview-exec';

function log(nodeId: string, occurredAt: string): ActionLog {
  return {
    id: `log_${nodeId}_${occurredAt}`,
    patientId: 'pat_a.a_1111',
    workflowId: 'wf_1',
    nodeId,
    channel: 'email' as ChannelNodeType,
    status: 'sent',
    occurredAt: new Date(occurredAt),
  };
}

const graph: WorkflowGraph = {
  nodes: [
    { id: 'start', type: 'start', position: { x: 0, y: 0 }, data: {} },
    { id: 'email', type: 'email', position: { x: 0, y: 0 }, data: { notifySecretariat: true } },
    {
      id: 'wait',
      type: 'wait',
      position: { x: 0, y: 0 },
      data: { delay: { value: 1, unit: 'days' } },
    },
    { id: 'sms', type: 'sms', position: { x: 0, y: 0 }, data: { notifySecretariat: true } },
    { id: 'end', type: 'end', position: { x: 0, y: 0 }, data: {} },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'email' },
    { id: 'e2', source: 'email', target: 'wait' },
    { id: 'e3', source: 'wait', target: 'sms' },
    { id: 'e4', source: 'sms', target: 'end' },
  ],
  viewport: { x: 0, y: 0, zoom: 1 },
};

describe('computeCurrentNodeId / computeNodeStatuses', () => {
  it('marks the last visited node current and the rest done', () => {
    const logs = [log('email', '2026-05-10'), log('sms', '2026-05-20')];
    expect(computeCurrentNodeId(logs)).toBe('sms');

    const statuses = computeNodeStatuses(logs);
    expect(statuses.get('email')).toBe('done');
    expect(statuses.get('sms')).toBe('current');
    expect(statuses.has('end')).toBe(false);
  });

  it('returns null / empty for a patient with no logs', () => {
    expect(computeCurrentNodeId([])).toBeNull();
    expect(computeNodeStatuses([]).size).toBe(0);
  });
});

describe('computeNextStep', () => {
  it('hops over structural nodes to the next channel node', () => {
    // From email → wait (structural) → sms (channel).
    const step = computeNextStep(graph, 'email');
    expect(step).toEqual({
      kind: 'channel',
      node: expect.objectContaining({ id: 'sms' }),
      channel: 'sms',
    });
  });

  it('returns end when the next reachable node is an End node', () => {
    expect(computeNextStep(graph, 'sms')).toEqual({ kind: 'end' });
  });

  it('returns none when there is no current node', () => {
    expect(computeNextStep(graph, null)).toEqual({ kind: 'none' });
  });

  it('returns none on a dead-end (no outgoing, not End)', () => {
    const orphanGraph: WorkflowGraph = {
      nodes: [
        { id: 'sms', type: 'sms', position: { x: 0, y: 0 }, data: { notifySecretariat: true } },
      ],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    };
    expect(computeNextStep(orphanGraph, 'sms')).toEqual({ kind: 'none' });
  });

  it('follows one of a condition node branches to a channel', () => {
    const condGraph: WorkflowGraph = {
      nodes: [
        { id: 'cond', type: 'condition', position: { x: 0, y: 0 }, data: { condition: 'c' } },
        { id: 'email', type: 'email', position: { x: 0, y: 0 }, data: { notifySecretariat: true } },
        { id: 'sms', type: 'sms', position: { x: 0, y: 0 }, data: { notifySecretariat: true } },
      ],
      edges: [
        { id: 'y', source: 'cond', target: 'email', sourceHandle: 'yes' },
        { id: 'n', source: 'cond', target: 'sms', sourceHandle: 'no' },
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    };
    const step = computeNextStep(condGraph, 'cond');
    expect(step.kind).toBe('channel');
    if (step.kind === 'channel') {
      expect(['email', 'sms']).toContain(step.channel);
    }
  });
});
