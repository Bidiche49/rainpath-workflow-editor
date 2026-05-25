import {
  CHANNEL_NODE_TYPES,
  type ActionLog,
  type ChannelNodeType,
  type NodeStatus,
  type WorkflowGraph,
  type WorkflowNode,
} from '@rainpath/schemas';

function isChannelType(type: string): type is ChannelNodeType {
  return (CHANNEL_NODE_TYPES as readonly string[]).includes(type);
}

/** The node carrying the patient's current position, or `null` if no log yet. */
export function computeCurrentNodeId(logsAsc: ActionLog[]): string | null {
  const last = logsAsc[logsAsc.length - 1];
  return last ? last.nodeId : null;
}

/**
 * The node the patient has actually *reached* — the most recent **non-pending**
 * log, or `startNodeId` when nothing has happened yet.
 *
 * A `pending` log is a *scheduled* action that hasn't occurred (the seed dates
 * it in the future), so it must not be mistaken for a completed step: it is the
 * next action to fire. The "Simulate next step" walk therefore advances from
 * this frontier, not from the last (possibly still-scheduled) log — otherwise a
 * patient sitting on a scheduled final action looks "done" and can never finish.
 *
 * `logsAsc` must be sorted ascending by `occurredAt`.
 */
export function computeFrontierNodeId(
  logsAsc: ActionLog[],
  startNodeId: string | null,
): string | null {
  for (let i = logsAsc.length - 1; i >= 0; i -= 1) {
    const log = logsAsc[i];
    if (log && log.status !== 'pending') return log.nodeId;
  }
  return startNodeId;
}

/**
 * Maps each visited node to its execution status (I-05):
 * - the last log's node → `current`;
 * - every other visited node → `done`;
 * - unvisited nodes are absent from the map (rendered idle / no highlight).
 *
 * `logsAsc` must be sorted ascending by `occurredAt`.
 */
export function computeNodeStatuses(logsAsc: ActionLog[]): Map<string, NodeStatus> {
  const statuses = new Map<string, NodeStatus>();
  const currentNodeId = computeCurrentNodeId(logsAsc);
  for (const log of logsAsc) {
    statuses.set(log.nodeId, 'done');
  }
  if (currentNodeId) statuses.set(currentNodeId, 'current');
  return statuses;
}

export type NextStep =
  | { kind: 'channel'; node: WorkflowNode; channel: ChannelNodeType }
  | { kind: 'end'; node: WorkflowNode }
  | { kind: 'none' };

/**
 * Walks forward from `currentNodeId` to the next channel node — the next
 * simulatable relance. Structural nodes (start/wait/condition) are hopped over;
 * a condition node forks on a random `yes`/`no` branch. Returns `end` when an
 * End node is reached and `none` on a dead-end, an orphan, or a cycle.
 */
export function computeNextStep(graph: WorkflowGraph, currentNodeId: string | null): NextStep {
  if (!currentNodeId) return { kind: 'none' };

  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const visited = new Set<string>();
  let cursor = currentNodeId;

  for (;;) {
    if (visited.has(cursor)) return { kind: 'none' };
    visited.add(cursor);

    const node = nodeById.get(cursor);
    if (!node) return { kind: 'none' };

    const outgoing = graph.edges.filter((edge) => edge.source === cursor);
    if (outgoing.length === 0) {
      return node.type === 'end' ? { kind: 'end', node } : { kind: 'none' };
    }

    let edge = outgoing[0];
    if (node.type === 'condition') {
      const branch = Math.random() < 0.5 ? 'yes' : 'no';
      edge = outgoing.find((e) => (e.sourceHandle ?? '') === branch) ?? outgoing[0];
    }
    if (!edge) return { kind: 'none' };

    const target = nodeById.get(edge.target);
    if (!target) return { kind: 'none' };

    if (isChannelType(target.type)) {
      return { kind: 'channel', node: target, channel: target.type };
    }
    if (target.type === 'end') return { kind: 'end', node: target };

    cursor = target.id;
  }
}
