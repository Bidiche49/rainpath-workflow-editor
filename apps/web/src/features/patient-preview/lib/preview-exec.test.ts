import type { ActionLog, ChannelNodeType, WorkflowGraph } from '@rainpath/schemas';
import { describe, expect, it } from 'vitest';

import { computeReachedNodeId, computeTakenPath, isChannelType } from './preview-exec';

function log(nodeId: string, occurredAt: string, status: ActionLog['status'] = 'sent'): ActionLog {
  return {
    id: `log_${nodeId}_${occurredAt}`,
    patientId: 'pat_a.a_1111',
    workflowId: 'wf_1',
    nodeId,
    channel: 'email' as ChannelNodeType,
    status,
    occurredAt: new Date(occurredAt),
  };
}

// start → email → wait → sms → end (linear).
const linearGraph: WorkflowGraph = {
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

// start → wa → condition ─yes→ email → end ; condition ─no→ end.
const branchGraph: WorkflowGraph = {
  nodes: [
    { id: 'start', type: 'start', position: { x: 0, y: 0 }, data: {} },
    { id: 'wa', type: 'whatsapp', position: { x: 0, y: 0 }, data: { notifySecretariat: true } },
    { id: 'cond', type: 'condition', position: { x: 0, y: 0 }, data: { condition: 'c' } },
    { id: 'email', type: 'email', position: { x: 0, y: 0 }, data: { notifySecretariat: true } },
    { id: 'end', type: 'end', position: { x: 0, y: 0 }, data: {} },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'wa' },
    { id: 'e2', source: 'wa', target: 'cond' },
    { id: 'e3', source: 'cond', target: 'email', sourceHandle: 'yes' },
    { id: 'e4', source: 'cond', target: 'end', sourceHandle: 'no' },
    { id: 'e5', source: 'email', target: 'end' },
  ],
  viewport: { x: 0, y: 0, zoom: 1 },
};

describe('isChannelType', () => {
  it('recognises channel node types and rejects structural ones', () => {
    expect(isChannelType('email')).toBe(true);
    expect(isChannelType('whatsapp')).toBe(true);
    expect(isChannelType('wait')).toBe(false);
    expect(isChannelType('condition')).toBe(false);
    expect(isChannelType('end')).toBe(false);
  });
});

describe('computeReachedNodeId', () => {
  it('returns the last non-pending log (a scheduled action is not yet reached)', () => {
    const logs = [log('email', '2026-05-10'), log('sms', '2026-06-01', 'pending')];
    expect(computeReachedNodeId(logs, 'start')).toBe('email');
  });

  it('returns the last log when nothing is pending', () => {
    expect(computeReachedNodeId([log('sms', '2026-05-10')], 'start')).toBe('sms');
  });

  it('falls back to the start node when nothing has happened', () => {
    expect(computeReachedNodeId([], 'start')).toBe('start');
    expect(computeReachedNodeId([log('email', '2026-06-01', 'pending')], 'start')).toBe('start');
  });
});

describe('computeTakenPath', () => {
  it('walks every node of a linear graph, including the wait', () => {
    const logs = [log('email', '2026-05-10'), log('sms', '2026-05-20')];
    expect(computeTakenPath(linearGraph, logs)).toEqual(['start', 'email', 'wait', 'sms', 'end']);
  });

  it('includes the condition and follows the branch the logs took (yes → email)', () => {
    const logs = [log('wa', '2026-05-10'), log('email', '2026-06-01', 'pending')];
    // The pending email sits on the yes branch → the path goes through the condition to it.
    expect(computeTakenPath(branchGraph, logs)).toEqual(['start', 'wa', 'cond', 'email', 'end']);
  });

  it('continues forward to the End past the last logged node', () => {
    // Only whatsapp logged: walk forward through the condition (default yes) to email → end.
    expect(computeTakenPath(branchGraph, [log('wa', '2026-05-10')])).toEqual([
      'start',
      'wa',
      'cond',
      'email',
      'end',
    ]);
  });

  it('returns an empty path when the graph has no Start node', () => {
    const noStart: WorkflowGraph = { ...linearGraph, nodes: linearGraph.nodes.slice(1) };
    expect(computeTakenPath(noStart, [])).toEqual([]);
  });

  it('from Start alone, walks the default route to the End', () => {
    expect(computeTakenPath(linearGraph, [])).toEqual(['start', 'email', 'wait', 'sms', 'end']);
  });

  it('still includes a logged node that is unreachable from the previous step', () => {
    // Disconnected: Start has no edges, yet a log lands on an isolated node.
    const disconnected: WorkflowGraph = {
      nodes: [
        { id: 'start', type: 'start', position: { x: 0, y: 0 }, data: {} },
        { id: 'iso', type: 'email', position: { x: 0, y: 0 }, data: { notifySecretariat: true } },
      ],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    };
    expect(computeTakenPath(disconnected, [log('iso', '2026-05-10')])).toEqual(['start', 'iso']);
  });
});
