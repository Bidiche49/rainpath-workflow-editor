import type { ActionLog, WorkflowGraph } from '@rainpath/schemas';
import { describe, expect, it } from 'vitest';

import { computeActiveEdges } from './active-edges';

type GraphNode = WorkflowGraph['nodes'][number];

/**
 * Builds a structural node. Only `id`/`type` matter for edge-path computation,
 * so an empty `data` is cast to the discriminated-union member for brevity.
 */
function node(id: string, type: GraphNode['type']): GraphNode {
  return { id, type, position: { x: 0, y: 0 }, data: {} } as GraphNode;
}

/** Minimal log on a channel node at a given second offset (for ordering). */
function log(nodeId: string, channel: ActionLog['channel'], second: number): ActionLog {
  return {
    id: `log-${nodeId}-${second}`,
    patientId: 'p1',
    workflowId: 'wf1',
    nodeId,
    channel,
    status: 'sent',
    occurredAt: new Date(2026, 0, 1, 0, 0, second),
  };
}

const viewport = { x: 0, y: 0, zoom: 1 };

describe('computeActiveEdges', () => {
  it('marks every edge on a linear traversed path and leaves the future dim', () => {
    // start →e1→ email →e2→ sms →e3→ end ; logged at email then sms.
    const graph: WorkflowGraph = {
      nodes: [node('start', 'start'), node('E', 'email'), node('S', 'sms'), node('end', 'end')],
      edges: [
        { id: 'e1', source: 'start', target: 'E' },
        { id: 'e2', source: 'E', target: 'S' },
        { id: 'e3', source: 'S', target: 'end' },
      ],
      viewport,
    };
    const active = computeActiveEdges(graph, [log('E', 'email', 1), log('S', 'sms', 2)]);
    expect(active).toEqual(new Set(['e1', 'e2']));
    // S → end is in the future (not yet reached) → not active.
    expect(active.has('e3')).toBe(false);
  });

  it('highlights the Yes branch and leaves the No branch inactive', () => {
    // start →e1→ email →e2→ condition ─yes(e3)→ sms ; condition ─no(e4)→ whatsapp.
    const graph: WorkflowGraph = {
      nodes: [
        node('start', 'start'),
        node('E', 'email'),
        node('C', 'condition'),
        node('S', 'sms'),
        node('W', 'whatsapp'),
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'E' },
        { id: 'e2', source: 'E', target: 'C' },
        { id: 'e3', source: 'C', target: 'S', sourceHandle: 'yes' },
        { id: 'e4', source: 'C', target: 'W', sourceHandle: 'no' },
      ],
      viewport,
    };
    const active = computeActiveEdges(graph, [log('E', 'email', 1), log('S', 'sms', 2)]);
    expect(active).toEqual(new Set(['e1', 'e2', 'e3']));
    expect(active.has('e4')).toBe(false);
  });

  it('highlights the No branch and leaves the Yes branch inactive', () => {
    const graph: WorkflowGraph = {
      nodes: [
        node('start', 'start'),
        node('E', 'email'),
        node('C', 'condition'),
        node('S', 'sms'),
        node('W', 'whatsapp'),
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'E' },
        { id: 'e2', source: 'E', target: 'C' },
        { id: 'e3', source: 'C', target: 'S', sourceHandle: 'yes' },
        { id: 'e4', source: 'C', target: 'W', sourceHandle: 'no' },
      ],
      viewport,
    };
    const active = computeActiveEdges(graph, [log('E', 'email', 1), log('W', 'whatsapp', 2)]);
    expect(active).toEqual(new Set(['e1', 'e2', 'e4']));
    expect(active.has('e3')).toBe(false);
  });

  it('lights the final edge into the reached End when a terminal node is given', () => {
    const graph: WorkflowGraph = {
      nodes: [node('start', 'start'), node('E', 'email'), node('S', 'sms'), node('end', 'end')],
      edges: [
        { id: 'e1', source: 'start', target: 'E' },
        { id: 'e2', source: 'E', target: 'S' },
        { id: 'e3', source: 'S', target: 'end' },
      ],
      viewport,
    };
    const logs = [log('E', 'email', 1), log('S', 'sms', 2)];
    // Without a terminal node, the S → end edge stays inactive.
    expect(computeActiveEdges(graph, logs).has('e3')).toBe(false);
    // Passing the reached End node lights it up.
    expect(computeActiveEdges(graph, logs, 'end')).toEqual(new Set(['e1', 'e2', 'e3']));
  });
});
