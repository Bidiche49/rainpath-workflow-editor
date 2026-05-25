import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ValidatableGraph } from '../lib/validation';
import { useGraphValidation } from './useGraphValidation';

const nodes = [
  { id: 's', type: 'start' },
  { id: 'e', type: 'email' },
  { id: 'end', type: 'end' },
];
const edges = [
  { id: 's-e', source: 's', target: 'e' },
  { id: 'e-end', source: 'e', target: 'end' },
];

describe('useGraphValidation', () => {
  it('validates the graph', () => {
    const { result } = renderHook(() => useGraphValidation({ nodes, edges }));
    expect(result.current.errors).toEqual([]);
    expect(result.current.warnings).toEqual([]);
  });

  it('memoises while node/edge references are stable (viewport-agnostic input)', () => {
    const graph: ValidatableGraph = { nodes, edges };
    const { result, rerender } = renderHook((g: ValidatableGraph) => useGraphValidation(g), {
      initialProps: graph,
    });
    const first = result.current;

    // Same node/edge references → same memoised result, even if the wrapping
    // object is a new reference.
    rerender({ nodes, edges });
    expect(result.current).toBe(first);
  });

  it('recomputes when the node/edge references change', () => {
    const { result, rerender } = renderHook((g: ValidatableGraph) => useGraphValidation(g), {
      initialProps: { nodes, edges } as ValidatableGraph,
    });
    const first = result.current;

    // Drop the start node → new array reference and a new (error) result.
    rerender({ nodes: [{ id: 'e', type: 'email' }], edges: [] });
    expect(result.current).not.toBe(first);
    expect(result.current.errors.length).toBeGreaterThan(0);
  });
});
