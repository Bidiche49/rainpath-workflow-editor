import type { ActionLog, WorkflowGraph } from '@rainpath/schemas';

/** Adjacency entry: an outgoing edge from a node. */
interface OutEdge {
  target: string;
  edgeId: string;
}

/**
 * Shortest path (BFS) from `from` to `to`, returned as the list of edge ids
 * traversed. Empty when `from === to` or when `to` is unreachable.
 *
 * BFS disambiguates condition branches naturally: only the branch that leads to
 * the next visited node is reconstructed, so the unused branch stays inactive.
 */
function shortestPathEdges(adjacency: Map<string, OutEdge[]>, from: string, to: string): string[] {
  if (from === to) return [];

  const prev = new Map<string, { node: string; edgeId: string }>();
  const visited = new Set<string>([from]);
  const queue: string[] = [from];

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (node === to) break;
    for (const { target, edgeId } of adjacency.get(node) ?? []) {
      if (visited.has(target)) continue;
      visited.add(target);
      prev.set(target, { node, edgeId });
      queue.push(target);
    }
  }

  if (!prev.has(to)) return [];

  const edges: string[] = [];
  let cursor = to;
  while (cursor !== from) {
    const step = prev.get(cursor);
    if (!step) return [];
    edges.push(step.edgeId);
    cursor = step.node;
  }
  return edges;
}

/**
 * Computes the set of edge ids the patient actually traversed, from the
 * chronologically-sorted action logs (I-08 FIX 4).
 *
 * Action logs only record *channel* nodes (the simulated sends); structural
 * nodes (Start, Wait, Condition) are never logged. So the patient's known
 * positions are: the Start node, then each logged node in order. Between two
 * consecutive positions we trace the shortest path through the graph and mark
 * every edge on it — which also surfaces the Wait/Condition hops in between and,
 * for a condition, only the branch that was actually taken.
 *
 * The read-only preview dims every edge *not* in this set, so the patient's
 * real route stands out while future paths and dead branches fade.
 */
export function computeActiveEdges(graph: WorkflowGraph, actionLogs: ActionLog[]): Set<string> {
  const active = new Set<string>();

  const logsAsc = [...actionLogs].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

  // Ordered list of node ids the patient is known to have occupied.
  const startId = graph.nodes.find((node) => node.type === 'start')?.id;
  const sequence: string[] = [];
  if (startId) sequence.push(startId);
  for (const log of logsAsc) {
    // Collapse consecutive logs that sit on the same node (no edge between them).
    if (sequence[sequence.length - 1] !== log.nodeId) sequence.push(log.nodeId);
  }

  // Adjacency list, built once.
  const adjacency = new Map<string, OutEdge[]>();
  for (const edge of graph.edges) {
    const list = adjacency.get(edge.source) ?? [];
    list.push({ target: edge.target, edgeId: edge.id });
    adjacency.set(edge.source, list);
  }

  for (let i = 0; i < sequence.length - 1; i += 1) {
    const from = sequence[i]!;
    const to = sequence[i + 1]!;
    for (const edgeId of shortestPathEdges(adjacency, from, to)) active.add(edgeId);
  }

  return active;
}
