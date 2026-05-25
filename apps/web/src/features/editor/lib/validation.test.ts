import type { WorkflowEdge, WorkflowGraph, WorkflowNode } from '@rainpath/schemas';
import { describe, expect, it } from 'vitest';

import { validateGraph } from './validation';

const VIEWPORT = { x: 0, y: 0, zoom: 1 };

function node(id: string, type: WorkflowNode['type']): WorkflowNode {
  switch (type) {
    case 'email':
    case 'sms':
    case 'whatsapp':
    case 'letter':
      return { id, type, position: { x: 0, y: 0 }, data: { notifySecretariat: true } };
    case 'wait':
      return { id, type, position: { x: 0, y: 0 }, data: { delay: { value: 1, unit: 'days' } } };
    case 'condition':
      return { id, type, position: { x: 0, y: 0 }, data: { condition: 'ok ?' } };
    default:
      return { id, type, position: { x: 0, y: 0 }, data: {} };
  }
}

function edge(source: string, target: string, sourceHandle?: string): WorkflowEdge {
  return { id: `${source}->${target}`, source, target, sourceHandle };
}

function graph(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowGraph {
  return { nodes, edges, viewport: VIEWPORT };
}

function codes(issues: { code: string }[]): string[] {
  return issues.map((i) => i.code);
}

describe('validateGraph — valid baseline', () => {
  it('reports no error and no warning on a clean start → email → end graph', () => {
    const result = validateGraph(
      graph(
        [node('s', 'start'), node('e', 'email'), node('end', 'end')],
        [edge('s', 'e'), edge('e', 'end')],
      ),
    );
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });
});

describe('validateGraph — errors', () => {
  it('errors when there is no start node', () => {
    const result = validateGraph(graph([node('end', 'end')], []));
    expect(codes(result.errors)).toContain('no-start');
  });

  it('errors when there is more than one start node (and tags both)', () => {
    const result = validateGraph(
      graph(
        [node('s1', 'start'), node('s2', 'start'), node('end', 'end')],
        [edge('s1', 'end'), edge('s2', 'end')],
      ),
    );
    expect(codes(result.errors)).toContain('multiple-starts');
    expect(result.errorsByNodeId.has('s1')).toBe(true);
    expect(result.errorsByNodeId.has('s2')).toBe(true);
  });

  it('errors when there is no end node', () => {
    const result = validateGraph(graph([node('s', 'start')], []));
    expect(codes(result.errors)).toContain('no-end');
  });

  it('errors when no end is reachable from start', () => {
    const result = validateGraph(graph([node('s', 'start'), node('end', 'end')], []));
    expect(codes(result.errors)).toContain('no-end-reachable');
  });

  it('reports both missing-start and missing-end on an empty graph', () => {
    const result = validateGraph(graph([], []));
    expect(codes(result.errors)).toEqual(expect.arrayContaining(['no-start', 'no-end']));
  });
});

describe('validateGraph — warnings', () => {
  it('warns about orphan (unreachable) nodes and indexes them by id', () => {
    const result = validateGraph(
      graph([node('s', 'start'), node('end', 'end'), node('lost', 'email')], [edge('s', 'end')]),
    );
    expect(codes(result.warnings)).toContain('orphan');
    expect(result.warningsByNodeId.has('lost')).toBe(true);
  });

  it('warns about a condition node with a single wired branch', () => {
    const result = validateGraph(
      graph(
        [node('s', 'start'), node('c', 'condition'), node('e', 'email'), node('end', 'end')],
        [edge('s', 'c'), edge('c', 'e', 'yes'), edge('e', 'end')], // only "yes" wired
      ),
    );
    expect(codes(result.warnings)).toContain('condition-single-branch');
    expect(result.warningsByNodeId.has('c')).toBe(true);
  });

  it('warns about an inescapable cycle (no condition to break out)', () => {
    const result = validateGraph(
      graph(
        [node('s', 'start'), node('a', 'wait'), node('b', 'wait'), node('end', 'end')],
        [edge('s', 'a'), edge('a', 'b'), edge('b', 'a'), edge('a', 'end')],
      ),
    );
    const cycle = result.warnings.find((w) => w.code === 'infinite-cycle');
    expect(cycle).toBeDefined();
    expect(cycle?.nodeIds).toEqual(expect.arrayContaining(['a', 'b']));
  });

  it('does NOT warn about a cycle that passes through a condition node', () => {
    const result = validateGraph(
      graph(
        [node('s', 'start'), node('c', 'condition'), node('w', 'wait'), node('end', 'end')],
        [edge('s', 'c'), edge('c', 'w', 'yes'), edge('w', 'c'), edge('c', 'end', 'no')],
      ),
    );
    expect(codes(result.warnings)).not.toContain('infinite-cycle');
  });
});

describe('validateGraph — robustness', () => {
  it('ignores edges that dangle to a removed node', () => {
    const result = validateGraph(
      graph([node('s', 'start'), node('end', 'end')], [edge('s', 'end'), edge('s', 'ghost')]),
    );
    expect(result.errors).toEqual([]);
  });
});
