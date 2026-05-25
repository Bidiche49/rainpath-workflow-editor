import type { WorkflowGraph } from '@rainpath/schemas';

/**
 * Pure graph-coherence checks for the workflow editor.
 *
 * Kept free of React/React Flow so it can be unit-tested in isolation and
 * reused by both the editor (live banner, B-03/I-06) and the API. `errors`
 * block a "clean" save; `warnings` are advisory (save still allowed, ADR-003
 * keeps the editor permissive).
 */
export interface GraphValidationResult {
  errors: string[];
  warnings: string[];
}

/** Adjacency list (source id -> target ids) built once from the edge list. */
function buildAdjacency(graph: WorkflowGraph): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  for (const node of graph.nodes) {
    adjacency.set(node.id, []);
  }
  for (const edge of graph.edges) {
    const targets = adjacency.get(edge.source);
    // Edge may dangle to/from an already-removed node; ignore it for traversal.
    if (targets && adjacency.has(edge.target)) {
      targets.push(edge.target);
    }
  }
  return adjacency;
}

/** Ids reachable by following edges forward from any of the given roots. */
function reachableFrom(roots: string[], adjacency: Map<string, string[]>): Set<string> {
  const seen = new Set<string>();
  const stack = [...roots];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined || seen.has(current)) continue;
    seen.add(current);
    for (const next of adjacency.get(current) ?? []) {
      if (!seen.has(next)) stack.push(next);
    }
  }
  return seen;
}

/** Detects whether the directed graph contains at least one cycle (DFS colors). */
function hasCycle(graph: WorkflowGraph, adjacency: Map<string, string[]>): boolean {
  const VISITING = 1;
  const DONE = 2;
  const state = new Map<string, number>();

  const visit = (id: string): boolean => {
    state.set(id, VISITING);
    for (const next of adjacency.get(id) ?? []) {
      const s = state.get(next);
      if (s === VISITING) return true;
      if (s === undefined && visit(next)) return true;
    }
    state.set(id, DONE);
    return false;
  };

  for (const node of graph.nodes) {
    if (state.get(node.id) === undefined && visit(node.id)) return true;
  }
  return false;
}

/**
 * Validates a workflow graph. The rules mirror ADR-003: a workflow must start
 * somewhere, must be able to finish, and must not loop forever.
 */
export function validateGraph(graph: WorkflowGraph): GraphValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const starts = graph.nodes.filter((n) => n.type === 'start');
  const ends = graph.nodes.filter((n) => n.type === 'end');
  const adjacency = buildAdjacency(graph);

  if (starts.length === 0) {
    errors.push('Aucun nœud de départ : ajoutez un nœud Start.');
  }
  if (starts.length > 1) {
    warnings.push(`${starts.length} nœuds de départ : un seul est recommandé.`);
  }

  const reachable = reachableFrom(
    starts.map((s) => s.id),
    adjacency,
  );

  if (ends.length === 0) {
    errors.push('Aucun nœud de fin : ajoutez un nœud End.');
  } else if (starts.length > 0 && !ends.some((e) => reachable.has(e.id))) {
    errors.push('Aucune fin atteignable depuis le départ.');
  }

  if (hasCycle(graph, adjacency)) {
    errors.push('Cycle détecté : le workflow boucle indéfiniment.');
  }

  // Orphans: nodes unreachable from any start (the start nodes themselves are
  // always "reachable" as roots, so they are never flagged).
  if (starts.length > 0) {
    const orphans = graph.nodes.filter((n) => !reachable.has(n.id));
    if (orphans.length > 0) {
      warnings.push(`${orphans.length} nœud(s) non atteignable(s) depuis le départ.`);
    }
  }

  // Dead ends: reachable, non-End nodes with no outgoing edge lead nowhere.
  const deadEnds = graph.nodes.filter(
    (n) => n.type !== 'end' && reachable.has(n.id) && (adjacency.get(n.id) ?? []).length === 0,
  );
  if (deadEnds.length > 0) {
    warnings.push(`${deadEnds.length} nœud(s) sans étape suivante.`);
  }

  return { errors, warnings };
}
