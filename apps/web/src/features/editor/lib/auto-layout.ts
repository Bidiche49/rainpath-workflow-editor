import dagre from 'dagre';

import type { AppEdge, AppNode } from '../hooks/useWorkflowEditor';

/**
 * Pure top-down auto-layout using dagre.
 *
 * Used once when an existing workflow is reloaded without a meaningful viewport
 * (B-03): React Flow stays in controlled mode, so we just recompute positions
 * and hand them back — the hook owns the state. Kept free of React so it is
 * trivially unit-testable.
 */

/** Nominal node box used for spacing (matches the chunky node footprint). */
const NODE_WIDTH = 208;
const NODE_HEIGHT = 84;

export type LayoutDirection = 'TB' | 'LR';

export function applyAutoLayout(
  nodes: AppNode[],
  edges: AppEdge[],
  direction: LayoutDirection = 'TB',
): AppNode[] {
  if (nodes.length === 0) return [];

  const graph = new dagre.graphlib.Graph();
  graph.setGraph({ rankdir: direction, nodesep: 60, ranksep: 90 });
  graph.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    // dagre throws if an edge references an unknown node — guard against
    // stale edges left behind by a removed node.
    if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
      graph.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(graph);

  return nodes.map((node) => {
    const { x, y } = graph.node(node.id);
    // dagre returns centre coordinates; React Flow positions are top-left.
    return { ...node, position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 } };
  });
}
