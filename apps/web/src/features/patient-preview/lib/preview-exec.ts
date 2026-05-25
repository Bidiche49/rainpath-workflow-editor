import {
  CHANNEL_NODE_TYPES,
  type ActionLog,
  type ChannelNodeType,
  type WorkflowGraph,
} from '@rainpath/schemas';

/** Narrow a node type to a channel (the only loggable / sendable kind). */
export function isChannelType(type: string): type is ChannelNodeType {
  return (CHANNEL_NODE_TYPES as readonly string[]).includes(type);
}

/** Outgoing adjacency: node id → its outgoing edges. */
function outgoing(
  graph: WorkflowGraph,
): Map<string, { target: string; sourceHandle: string | null }[]> {
  const map = new Map<string, { target: string; sourceHandle: string | null }[]>();
  for (const edge of graph.edges) {
    const list = map.get(edge.source) ?? [];
    list.push({ target: edge.target, sourceHandle: edge.sourceHandle ?? null });
    map.set(edge.source, list);
  }
  return map;
}

/** Shortest node path from `from` to `to` (inclusive), or `null` if unreachable. */
function shortestNodePath(
  adj: Map<string, { target: string; sourceHandle: string | null }[]>,
  from: string,
  to: string,
): string[] | null {
  if (from === to) return [from];
  const prev = new Map<string, string>();
  const visited = new Set<string>([from]);
  const queue: string[] = [from];

  while (queue.length > 0) {
    const node = queue.shift()!;
    for (const { target } of adj.get(node) ?? []) {
      if (visited.has(target)) continue;
      visited.add(target);
      prev.set(target, node);
      if (target === to) {
        const path = [to];
        let cursor = to;
        while (cursor !== from) {
          cursor = prev.get(cursor)!;
          path.unshift(cursor);
        }
        return path;
      }
      queue.push(target);
    }
  }
  return null;
}

/**
 * The ordered list of node ids the patient walks, Start → … → End — the route
 * the read-only preview steps along, one node at a time (I-08).
 *
 * Branch choices *up to the last recorded action* come from the logs: we stitch
 * the shortest path between each consecutive logged node (incl. a scheduled
 * `pending` one), which faithfully reproduces the branch the patient took at
 * every condition. Past the last logged node, the walk continues forward
 * through the graph (a condition defaults to its `yes` branch) until an End.
 *
 * `logsAsc` must be sorted ascending by `occurredAt`. Returns `[]` with no Start.
 */
export function computeTakenPath(graph: WorkflowGraph, logsAsc: ActionLog[]): string[] {
  const adj = outgoing(graph);
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const startId = graph.nodes.find((node) => node.type === 'start')?.id ?? null;
  if (!startId) return [];

  // Waypoints: Start, then each logged node (chronological, consecutive dups merged).
  const waypoints: string[] = [startId];
  for (const log of logsAsc) {
    if (waypoints[waypoints.length - 1] !== log.nodeId) waypoints.push(log.nodeId);
  }

  // Stitch the shortest path between consecutive waypoints.
  const path: string[] = [waypoints[0]!];
  for (let i = 1; i < waypoints.length; i += 1) {
    const segment = shortestNodePath(adj, waypoints[i - 1]!, waypoints[i]!);
    if (segment) path.push(...segment.slice(1));
    else path.push(waypoints[i]!);
  }

  // Continue forward to the End past the last waypoint (default = `yes` branch).
  const seen = new Set(path);
  let cursor = path[path.length - 1]!;
  for (;;) {
    const node = nodeById.get(cursor);
    if (!node || node.type === 'end') break;
    const outs = adj.get(cursor) ?? [];
    if (outs.length === 0) break;
    const chosen =
      node.type === 'condition'
        ? (outs.find((e) => (e.sourceHandle ?? '') === 'yes') ?? outs[0]!)
        : outs[0]!;
    if (seen.has(chosen.target)) break; // guard against cycles
    seen.add(chosen.target);
    path.push(chosen.target);
    cursor = chosen.target;
  }

  return path;
}

/** The node actually reached: the last non-`pending` log, or the Start node. */
export function computeReachedNodeId(
  logsAsc: ActionLog[],
  startNodeId: string | null,
): string | null {
  for (let i = logsAsc.length - 1; i >= 0; i -= 1) {
    const log = logsAsc[i];
    if (log && log.status !== 'pending') return log.nodeId;
  }
  return startNodeId;
}
