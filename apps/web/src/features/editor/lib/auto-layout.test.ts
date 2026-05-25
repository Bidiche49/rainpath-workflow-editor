import { describe, expect, it } from 'vitest';

import type { AppEdge, AppNode } from '../hooks/useWorkflowEditor';

import { applyAutoLayout } from './auto-layout';

function node(id: string): AppNode {
  return { id, type: 'wait', position: { x: 0, y: 0 }, data: {} };
}

describe('applyAutoLayout', () => {
  it('returns an empty array for an empty graph', () => {
    expect(applyAutoLayout([], [])).toEqual([]);
  });

  it('lays a linear chain out top-down with no vertical overlap', () => {
    const nodes: AppNode[] = [node('a'), node('b'), node('c')];
    const edges: AppEdge[] = [
      { id: 'a-b', source: 'a', target: 'b' },
      { id: 'b-c', source: 'b', target: 'c' },
    ];

    const laidOut = applyAutoLayout(nodes, edges);
    const [a, b, c] = laidOut.map((n) => n.position);

    // strictly increasing y => top-down ordering
    expect(a!.y).toBeLessThan(b!.y);
    expect(b!.y).toBeLessThan(c!.y);
    // each rank is separated by at least one node height (no overlap)
    expect(b!.y - a!.y).toBeGreaterThan(84);
    expect(c!.y - b!.y).toBeGreaterThan(84);
  });

  it('keeps all node ids and produces a position for each', () => {
    const nodes: AppNode[] = [node('a'), node('b')];
    const laidOut = applyAutoLayout(nodes, [{ id: 'a-b', source: 'a', target: 'b' }]);
    expect(laidOut.map((n) => n.id).sort()).toEqual(['a', 'b']);
    for (const n of laidOut) {
      expect(Number.isFinite(n.position.x)).toBe(true);
      expect(Number.isFinite(n.position.y)).toBe(true);
    }
  });

  it('ignores edges that reference a removed node', () => {
    const nodes: AppNode[] = [node('a'), node('b')];
    const edges: AppEdge[] = [
      { id: 'a-b', source: 'a', target: 'b' },
      { id: 'a-ghost', source: 'a', target: 'ghost' },
    ];
    expect(() => applyAutoLayout(nodes, edges)).not.toThrow();
  });

  it('separates two sibling branches horizontally', () => {
    const nodes: AppNode[] = [node('root'), node('left'), node('right')];
    const edges: AppEdge[] = [
      { id: 'r-l', source: 'root', target: 'left' },
      { id: 'r-r', source: 'root', target: 'right' },
    ];
    const laidOut = applyAutoLayout(nodes, edges);
    const left = laidOut.find((n) => n.id === 'left')!.position;
    const right = laidOut.find((n) => n.id === 'right')!.position;
    expect(left.x).not.toBe(right.x);
  });
});
