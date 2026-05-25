import type { ActionLog, ChannelNodeType, WorkflowGraph } from '@rainpath/schemas';
import { afterEach, describe, expect, it, vi } from 'vitest';

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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('takes the "yes" branch when the random roll is low', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const step = computeNextStep(condGraph, 'cond');
    expect(step.kind === 'channel' && step.channel).toBe('email');
  });

  it('takes the "no" branch when the random roll is high', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const step = computeNextStep(condGraph, 'cond');
    expect(step.kind === 'channel' && step.channel).toBe('sms');
  });

  it('falls back to the first outgoing edge when the rolled branch is unwired', () => {
    // Only the "no" branch exists; rolling "yes" must not crash — it falls back.
    const oneBranch: WorkflowGraph = {
      ...condGraph,
      edges: [{ id: 'n', source: 'cond', target: 'sms', sourceHandle: 'no' }],
    };
    vi.spyOn(Math, 'random').mockReturnValue(0.1); // would pick "yes"
    const step = computeNextStep(oneBranch, 'cond');
    expect(step.kind === 'channel' && step.channel).toBe('sms');
  });

  it('returns end when the cursor itself is a terminal End node', () => {
    const g: WorkflowGraph = {
      nodes: [{ id: 'end', type: 'end', position: { x: 0, y: 0 }, data: {} }],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    };
    expect(computeNextStep(g, 'end')).toEqual({ kind: 'end' });
  });

  it('returns none when the current node id is absent from the graph', () => {
    expect(computeNextStep(graph, 'ghost')).toEqual({ kind: 'none' });
  });

  it('returns none when an edge points to a missing target node', () => {
    const dangling: WorkflowGraph = {
      nodes: [
        { id: 'email', type: 'email', position: { x: 0, y: 0 }, data: { notifySecretariat: true } },
      ],
      edges: [{ id: 'e', source: 'email', target: 'gone' }],
      viewport: { x: 0, y: 0, zoom: 1 },
    };
    expect(computeNextStep(dangling, 'email')).toEqual({ kind: 'none' });
  });

  it('returns none on a cycle with no channel node to land on', () => {
    const loop: WorkflowGraph = {
      nodes: [
        {
          id: 'w1',
          type: 'wait',
          position: { x: 0, y: 0 },
          data: { delay: { value: 1, unit: 'days' } },
        },
        {
          id: 'w2',
          type: 'wait',
          position: { x: 0, y: 0 },
          data: { delay: { value: 1, unit: 'days' } },
        },
      ],
      edges: [
        { id: 'a', source: 'w1', target: 'w2' },
        { id: 'b', source: 'w2', target: 'w1' },
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    };
    expect(computeNextStep(loop, 'w1')).toEqual({ kind: 'none' });
  });
});
