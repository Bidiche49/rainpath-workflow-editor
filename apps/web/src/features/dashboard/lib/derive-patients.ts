import { CHANNEL_NODE_TYPES } from '@rainpath/schemas';
import type { ActionLog, ActionStatus, NodeType, Workflow } from '@rainpath/schemas';

/** Aggregate progression of a patient, derived from their action logs. */
export type PatientUiStatus = 'en_cours' | 'bloque' | 'termine';

export interface PatientRow {
  patientId: string;
  /** Display name reconstructed from the patient id (no Patient table exists). */
  name: string;
  workflowId: string;
  workflowName: string;
  /** Type of the most recent visited node — drives the channel badge. */
  currentNodeType: NodeType;
  lastActionStatus: ActionStatus;
  lastActionAt: Date;
  status: PatientUiStatus;
}

/**
 * Reconstructs a readable name from a seeded patient id of the form
 * `pat_jean.dupont_a1b2`. Falls back to the raw id when the shape is unexpected.
 */
export function patientDisplayName(patientId: string): string {
  const match = /^pat_(.+)_[a-z0-9]+$/i.exec(patientId);
  const slug = match?.[1] ?? patientId;
  const parts = slug.split('.').filter(Boolean);
  if (parts.length === 0) return patientId;
  return parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

const CHANNEL_TYPES = new Set<NodeType>(CHANNEL_NODE_TYPES);

/**
 * True when at least one channel node is still reachable downstream from
 * `fromNodeId`. Deterministic: it explores every outgoing branch (it does not
 * pick a `yes`/`no` fork like `computeNextStep`), so a patient's status never
 * flips between renders. When this returns false the patient can receive no
 * further relance — their journey has run its course.
 *
 * Returns `true` for an unknown graph: without the workflow we cannot prove the
 * journey is over, so we never label such a patient `termine`.
 */
function hasDownstreamChannel(workflow: Workflow | undefined, fromNodeId: string): boolean {
  if (!workflow) return true;

  const nodeTypeById = new Map(workflow.graph.nodes.map((node) => [node.id, node.type]));
  const targetsBySource = new Map<string, string[]>();
  for (const edge of workflow.graph.edges) {
    const existing = targetsBySource.get(edge.source);
    if (existing) existing.push(edge.target);
    else targetsBySource.set(edge.source, [edge.target]);
  }

  const seen = new Set<string>();
  const queue = [...(targetsBySource.get(fromNodeId) ?? [])];
  while (queue.length > 0) {
    const id = queue.shift();
    if (id === undefined || seen.has(id)) continue;
    seen.add(id);
    if (CHANNEL_TYPES.has(nodeTypeById.get(id) as NodeType)) return true;
    queue.push(...(targetsBySource.get(id) ?? []));
  }
  return false;
}

/**
 * Derives one row per distinct patient from the full action-log set.
 *
 * `logs` is expected newest-first (the API sorts by `occurredAt desc`), so the
 * first log seen for a patient is their latest action.
 *
 * The status reads the patient's **latest log**, not their whole history — a
 * single failure early in a journey that later recovered must not pin a patient
 * to `bloque` forever. In priority order:
 * - the latest log is `pending` → a relance is scheduled ahead, so the patient
 *   is still moving even if it sits on the journey's final channel → `en_cours`
 *   (this guard must come first: otherwise a pending on the last channel would
 *   read as "journey over");
 * - otherwise, if no channel node remains reachable downstream of the latest
 *   node, the patient has run the journey to its end → `termine`. (This is the
 *   real-model meaning of "reached the End": `ActionLog.channel` can only be a
 *   channel, so no log ever lands on an End node — we detect the end of the road
 *   structurally via `hasDownstreamChannel`, not by a log on an `end` node.)
 * - otherwise, if the latest relance `failed`, the journey stalled on a failure
 *   and needs attention → `bloque`;
 * - otherwise → `en_cours`.
 */
export function derivePatients(logs: ActionLog[], workflows: Workflow[]): PatientRow[] {
  const workflowById = new Map(workflows.map((workflow) => [workflow.id, workflow]));

  // Group preserving newest-first order (logs arrive sorted desc by occurredAt).
  const byPatient = new Map<string, ActionLog[]>();
  for (const log of logs) {
    const existing = byPatient.get(log.patientId);
    if (existing) existing.push(log);
    else byPatient.set(log.patientId, [log]);
  }

  const rows: PatientRow[] = [];
  for (const [patientId, patientLogs] of byPatient) {
    const latest = patientLogs[0];
    if (!latest) continue;

    const workflow = workflowById.get(latest.workflowId);
    const nodeTypeById = new Map<string, NodeType>(
      workflow ? workflow.graph.nodes.map((node) => [node.id, node.type]) : [],
    );

    const journeyOver = !hasDownstreamChannel(workflow, latest.nodeId);
    const status: PatientUiStatus =
      latest.status === 'pending'
        ? 'en_cours'
        : journeyOver
          ? 'termine'
          : latest.status === 'failed'
            ? 'bloque'
            : 'en_cours';

    rows.push({
      patientId,
      name: patientDisplayName(patientId),
      workflowId: latest.workflowId,
      workflowName: workflow?.name ?? 'Workflow inconnu',
      // Prefer the graph node type; fall back to the log channel if the node is
      // gone (e.g. the workflow was edited after the log was recorded).
      currentNodeType: nodeTypeById.get(latest.nodeId) ?? latest.channel,
      lastActionStatus: latest.status,
      lastActionAt: latest.occurredAt,
      status,
    });
  }

  return rows;
}

/** Number of relances actually sent (status sent/failed) in the last `days`. */
export function countRelancesInLastDays(logs: ActionLog[], days = 7): number {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return logs.filter(
    (log) =>
      (log.status === 'sent' || log.status === 'failed') && log.occurredAt.getTime() >= cutoff,
  ).length;
}
