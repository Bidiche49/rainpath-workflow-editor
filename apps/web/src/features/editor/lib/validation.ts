/**
 * Pure graph-coherence checks for the workflow editor.
 *
 * Kept free of React/React Flow so it can be unit-tested in isolation and
 * reused by the editor (live banner + per-node badges, I-06). The input is a
 * structural subset satisfied by both the canonical `WorkflowGraph` and the
 * live editor state (`useWorkflowEditor`'s React Flow `nodes`/`edges`), so we
 * never have to Zod-parse on every render to validate.
 *
 * `errors` are critical (a clean save is blocked / confirmed); `warnings` are
 * advisory (save still allowed, ADR-003 keeps the editor permissive).
 */

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  /** Stable machine code for the rule that fired. */
  code: string;
  severity: ValidationSeverity;
  /** Human-readable, French message shown in the banner / tooltip. */
  message: string;
  /** Nodes this issue concerns (empty for graph-global issues). */
  nodeIds: string[];
}

export interface GraphValidationResult {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  errorsByNodeId: Map<string, ValidationIssue[]>;
  warningsByNodeId: Map<string, ValidationIssue[]>;
}

/** Minimal node shape the rules read (React Flow `Node.type` is optional). */
export interface ValidatableNode {
  id: string;
  type?: string | undefined;
}

/** Minimal edge shape the rules read. */
export interface ValidatableEdge {
  source: string;
  target: string;
  sourceHandle?: string | null | undefined;
}

export interface ValidatableGraph {
  nodes: ValidatableNode[];
  edges: ValidatableEdge[];
}

/** Adjacency list (source id -> target ids) built once from the edge list. */
function buildAdjacency(graph: ValidatableGraph): Map<string, string[]> {
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

/**
 * Tarjan's SCC — returns the set of node ids that belong to a cycle: any
 * strongly-connected component of size > 1, plus single nodes carrying a
 * self-loop.
 */
function cyclicNodeIds(graph: ValidatableGraph, adjacency: Map<string, string[]>): Set<string> {
  const index = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const result = new Set<string>();
  const selfLooped = new Set(
    graph.edges.filter((edge) => edge.source === edge.target).map((edge) => edge.source),
  );
  let counter = 0;

  const strongConnect = (v: string): void => {
    index.set(v, counter);
    lowlink.set(v, counter);
    counter += 1;
    stack.push(v);
    onStack.add(v);

    for (const w of adjacency.get(v) ?? []) {
      if (!index.has(w)) {
        strongConnect(w);
        lowlink.set(v, Math.min(lowlink.get(v) ?? 0, lowlink.get(w) ?? 0));
      } else if (onStack.has(w)) {
        lowlink.set(v, Math.min(lowlink.get(v) ?? 0, index.get(w) ?? 0));
      }
    }

    if ((lowlink.get(v) ?? 0) === (index.get(v) ?? 0)) {
      const component: string[] = [];
      let popped: string | undefined;
      do {
        popped = stack.pop();
        if (popped === undefined) break;
        onStack.delete(popped);
        component.push(popped);
      } while (popped !== v);

      if (component.length > 1) {
        for (const id of component) result.add(id);
      } else if (component.length === 1) {
        const only = component[0];
        if (only !== undefined && selfLooped.has(only)) result.add(only);
      }
    }
  };

  for (const node of graph.nodes) {
    if (!index.has(node.id)) strongConnect(node.id);
  }
  return result;
}

function groupByNodeId(issues: ValidationIssue[]): Map<string, ValidationIssue[]> {
  const map = new Map<string, ValidationIssue[]>();
  for (const issue of issues) {
    for (const id of issue.nodeIds) {
      const list = map.get(id);
      if (list) list.push(issue);
      else map.set(id, [issue]);
    }
  }
  return map;
}

/**
 * Validates a workflow graph. Errors: missing/duplicate Start, no reachable
 * End. Warnings: orphan nodes, condition nodes with a single wired branch,
 * dead ends, and inescapable cycles (a cycle with no condition node to break
 * out of it).
 */
export function validateGraph(graph: ValidatableGraph): GraphValidationResult {
  const issues: ValidationIssue[] = [];

  const starts = graph.nodes.filter((n) => n.type === 'start');
  const ends = graph.nodes.filter((n) => n.type === 'end');
  const conditions = graph.nodes.filter((n) => n.type === 'condition');
  const adjacency = buildAdjacency(graph);

  // ── Errors ─────────────────────────────────────────────────────────────────
  if (starts.length === 0) {
    issues.push({
      code: 'no-start',
      severity: 'error',
      message: 'Aucun nœud de départ : ajoutez un nœud Début.',
      nodeIds: [],
    });
  } else if (starts.length > 1) {
    issues.push({
      code: 'multiple-starts',
      severity: 'error',
      message: `${starts.length} nœuds de départ : un seul est autorisé.`,
      nodeIds: starts.map((s) => s.id),
    });
  }

  const reachable = reachableFrom(
    starts.map((s) => s.id),
    adjacency,
  );

  if (ends.length === 0) {
    issues.push({
      code: 'no-end',
      severity: 'error',
      message: 'Aucun nœud de fin : ajoutez un nœud Fin.',
      nodeIds: [],
    });
  } else if (starts.length > 0 && !ends.some((e) => reachable.has(e.id))) {
    issues.push({
      code: 'no-end-reachable',
      severity: 'error',
      message: 'Aucune fin atteignable depuis le départ.',
      nodeIds: [],
    });
  }

  // ── Warnings ────────────────────────────────────────────────────────────────
  if (starts.length > 0) {
    const orphans = graph.nodes.filter((n) => !reachable.has(n.id));
    if (orphans.length > 0) {
      issues.push({
        code: 'orphan',
        severity: 'warning',
        message: `${orphans.length} nœud(s) non atteignable(s) depuis le départ.`,
        nodeIds: orphans.map((n) => n.id),
      });
    }
  }

  for (const condition of conditions) {
    const handles = new Set(
      graph.edges.filter((e) => e.source === condition.id).map((e) => e.sourceHandle ?? ''),
    );
    if (!handles.has('yes') || !handles.has('no')) {
      issues.push({
        code: 'condition-single-branch',
        severity: 'warning',
        message: 'Nœud condition : une seule branche (Oui/Non) est reliée.',
        nodeIds: [condition.id],
      });
    }
  }

  // Dead ends: reachable, non-End nodes with no outgoing edge lead nowhere.
  const deadEnds = graph.nodes.filter(
    (n) => n.type !== 'end' && reachable.has(n.id) && (adjacency.get(n.id) ?? []).length === 0,
  );
  if (deadEnds.length > 0) {
    issues.push({
      code: 'dead-end',
      severity: 'warning',
      message: `${deadEnds.length} nœud(s) sans étape suivante.`,
      nodeIds: deadEnds.map((n) => n.id),
    });
  }

  // Inescapable cycle: a cycle with no condition node to break out of it.
  const cyclic = cyclicNodeIds(graph, adjacency);
  if (cyclic.size > 0) {
    const hasEscape = [...cyclic].some((id) => conditions.some((condition) => condition.id === id));
    if (!hasEscape) {
      issues.push({
        code: 'infinite-cycle',
        severity: 'warning',
        message: 'Cycle sans condition de sortie : le workflow peut boucler indéfiniment.',
        nodeIds: [...cyclic],
      });
    }
  }

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  return {
    errors,
    warnings,
    errorsByNodeId: groupByNodeId(errors),
    warningsByNodeId: groupByNodeId(warnings),
  };
}
