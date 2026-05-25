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

/**
 * Derives one row per distinct patient from the full action-log set.
 *
 * `logs` is expected newest-first (the API sorts by `occurredAt desc`), so the
 * first log seen for a patient is their latest action.
 *
 * Status rules (see ticket I-04 + seed reality):
 * - a node of type `end` was visited → `termine` (completed the journey);
 * - otherwise any `failed` relance → `bloque`. NOTE: the seed only ever emits a
 *   `failed` log as the *first* step (later steps succeed and the latest log is
 *   the scheduled `pending` one), so a strict "latest log failed" rule would
 *   never flag anyone. Treating "has a failed relance" as blocked is the only
 *   reading that makes the Bloqués card meaningful with the seeded data and
 *   matches the dashboard's intent of surfacing patients needing attention;
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

    const reachedEnd = patientLogs.some((log) => nodeTypeById.get(log.nodeId) === 'end');
    const hasFailure = patientLogs.some((log) => log.status === 'failed');
    const status: PatientUiStatus = reachedEnd ? 'termine' : hasFailure ? 'bloque' : 'en_cours';

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
