import { describe, expect, it } from 'vitest';

import type { WorkflowEdge, WorkflowGraph, WorkflowNode } from '@rainpath/schemas';

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

describe('validateGraph', () => {
  it('reports no error on a valid start → email → end graph', () => {
    const result = validateGraph(
      graph(
        [node('s', 'start'), node('e', 'email'), node('end', 'end')],
        [edge('s', 'e'), edge('e', 'end')],
      ),
    );
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('errors when there is no start node', () => {
    const result = validateGraph(graph([node('end', 'end')], []));
    expect(result.errors).toContain('Aucun nœud de départ : ajoutez un nœud Start.');
  });

  it('errors when there is no end node', () => {
    const result = validateGraph(graph([node('s', 'start')], []));
    expect(result.errors).toContain('Aucun nœud de fin : ajoutez un nœud End.');
  });

  it('errors when no end is reachable from start', () => {
    const result = validateGraph(
      graph([node('s', 'start'), node('end', 'end')], []), // disconnected end
    );
    expect(result.errors).toContain('Aucune fin atteignable depuis le départ.');
  });

  it('detects an infinite cycle', () => {
    const result = validateGraph(
      graph(
        [node('s', 'start'), node('a', 'wait'), node('b', 'wait'), node('end', 'end')],
        [edge('s', 'a'), edge('a', 'b'), edge('b', 'a'), edge('a', 'end')],
      ),
    );
    expect(result.errors).toContain('Cycle détecté : le workflow boucle indéfiniment.');
  });

  it('warns about multiple start nodes', () => {
    const result = validateGraph(
      graph(
        [node('s1', 'start'), node('s2', 'start'), node('end', 'end')],
        [edge('s1', 'end'), edge('s2', 'end')],
      ),
    );
    expect(result.warnings.some((w) => w.includes('nœuds de départ'))).toBe(true);
  });

  it('warns about orphan (unreachable) nodes', () => {
    const result = validateGraph(
      graph([node('s', 'start'), node('end', 'end'), node('lost', 'email')], [edge('s', 'end')]),
    );
    expect(result.warnings.some((w) => w.includes('non atteignable'))).toBe(true);
  });

  it('warns about reachable dead-end nodes (no next step)', () => {
    const result = validateGraph(
      graph(
        [node('s', 'start'), node('e', 'email'), node('end', 'end')],
        [edge('s', 'e'), edge('s', 'end')], // email reachable but goes nowhere
      ),
    );
    expect(result.warnings.some((w) => w.includes('sans étape suivante'))).toBe(true);
  });

  it('ignores edges that dangle to a removed node', () => {
    const result = validateGraph(
      graph(
        [node('s', 'start'), node('end', 'end')],
        [edge('s', 'end'), edge('s', 'ghost')], // ghost no longer exists
      ),
    );
    expect(result.errors).toEqual([]);
  });

  it('handles a fully empty graph (no start, no end)', () => {
    const result = validateGraph(graph([], []));
    expect(result.errors).toContain('Aucun nœud de départ : ajoutez un nœud Start.');
    expect(result.errors).toContain('Aucun nœud de fin : ajoutez un nœud End.');
  });
});
