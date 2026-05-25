import { useMemo } from 'react';

import {
  validateGraph,
  type GraphValidationResult,
  type ValidatableGraph,
} from '../lib/validation';

/**
 * Live graph validation, memoised on the node/edge references. Viewport changes
 * (pan/zoom) do not retrigger it — only structural edits do. The editor state
 * keeps stable array references between renders, so this recomputes exactly
 * when the graph actually changes.
 */
export function useGraphValidation(graph: ValidatableGraph): GraphValidationResult {
  return useMemo(() => validateGraph(graph), [graph.nodes, graph.edges]);
}
