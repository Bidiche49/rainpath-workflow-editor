import type { ActionLog, ActionStatus, ChannelNodeType, Workflow } from '@rainpath/schemas';
import { describe, expect, it } from 'vitest';

import { countRelancesInLastDays, derivePatients, patientDisplayName } from './derive-patients';

function log(partial: Partial<ActionLog> & { patientId: string }): ActionLog {
  return {
    id: `log_${Math.random().toString(36).slice(2)}`,
    workflowId: 'wf_1',
    nodeId: 'email',
    channel: 'email' as ChannelNodeType,
    status: 'sent' as ActionStatus,
    occurredAt: new Date(),
    ...partial,
  };
}

const workflow: Workflow = {
  id: 'wf_1',
  name: 'Relance J+7',
  schemaVersion: 1,
  graph: {
    nodes: [
      { id: 'start', type: 'start', position: { x: 0, y: 0 }, data: {} },
      { id: 'email', type: 'email', position: { x: 0, y: 0 }, data: { notifySecretariat: true } },
      { id: 'sms', type: 'sms', position: { x: 0, y: 0 }, data: { notifySecretariat: true } },
      { id: 'end', type: 'end', position: { x: 0, y: 0 }, data: {} },
    ],
    // start → email → sms → end: a channel (sms) is reachable after email, none
    // after sms, so the current node alone determines whether the journey is over.
    edges: [
      { id: 'e1', source: 'start', target: 'email' },
      { id: 'e2', source: 'email', target: 'sms' },
      { id: 'e3', source: 'sms', target: 'end' },
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
  },
  settings: { notificationEmail: 'secretariat@labo.fr' },
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('patientDisplayName', () => {
  it('reconstructs a readable name from a seeded id', () => {
    expect(patientDisplayName('pat_jean.dupont_a1b2')).toBe('Jean Dupont');
    expect(patientDisplayName('pat_marie.de.la.tour_zz99')).toBe('Marie De La Tour');
  });

  it('falls back to the raw id on an unexpected shape', () => {
    expect(patientDisplayName('anonymous')).toBe('Anonymous');
  });

  it('falls back to the raw id when the slug has no usable parts', () => {
    // No `pat_…` prefix → slug is the raw id; only dots → every part is empty.
    expect(patientDisplayName('...')).toBe('...');
  });
});

describe('derivePatients', () => {
  it('produces one row per distinct patient, latest action first', () => {
    const rows = derivePatients(
      [
        log({ patientId: 'pat_a.a_1111', occurredAt: new Date('2026-05-20') }),
        log({ patientId: 'pat_a.a_1111', occurredAt: new Date('2026-05-10') }),
        log({ patientId: 'pat_b.b_2222', occurredAt: new Date('2026-05-22') }),
      ],
      [workflow],
    );

    expect(rows).toHaveLength(2);
    const a = rows.find((r) => r.patientId === 'pat_a.a_1111');
    expect(a?.lastActionAt).toEqual(new Date('2026-05-20'));
    expect(a?.workflowName).toBe('Relance J+7');
  });

  it('flags a stalled patient (failure, nothing scheduled) as bloque', () => {
    // Current node `email` still has a downstream channel (sms) but nothing is
    // scheduled and the last relance failed → the journey stalled.
    const [row] = derivePatients(
      [log({ patientId: 'pat_x.x_0001', nodeId: 'email', status: 'failed' })],
      [workflow],
    );
    expect(row?.status).toBe('bloque');
  });

  it('keeps a patient with a re-scheduled relance en_cours despite a past failure', () => {
    // A pending log means a relance is scheduled ahead, so the patient is still
    // in progress even though an earlier step failed.
    const [row] = derivePatients(
      [
        log({ patientId: 'pat_x.x_0001', status: 'pending', occurredAt: new Date('2026-05-20') }),
        log({ patientId: 'pat_x.x_0001', status: 'failed', occurredAt: new Date('2026-05-10') }),
      ],
      [workflow],
    );
    expect(row?.status).toBe('en_cours');
  });

  it('flags a patient whose journey has no downstream channel as termine (over a failure)', () => {
    // Current node `sms` is the last channel (only `end` is reachable after it),
    // so the journey is over even though an earlier step failed.
    const [row] = derivePatients(
      [
        log({ patientId: 'pat_y.y_0002', nodeId: 'sms', occurredAt: new Date('2026-05-20') }),
        log({
          patientId: 'pat_y.y_0002',
          nodeId: 'email',
          status: 'failed',
          occurredAt: new Date('2026-05-10'),
        }),
      ],
      [workflow],
    );
    expect(row?.status).toBe('termine');
  });

  it('flags an in-progress patient (sent/pending only) as en_cours', () => {
    const [row] = derivePatients(
      [log({ patientId: 'pat_z.z_0003', status: 'pending' })],
      [workflow],
    );
    expect(row?.status).toBe('en_cours');
    expect(row?.currentNodeType).toBe('email');
  });

  it('labels an unknown workflow and falls back to the log channel for the node type', () => {
    const [row] = derivePatients(
      [log({ patientId: 'pat_u.u_0004', workflowId: 'wf_gone', channel: 'sms' })],
      [workflow], // does not contain wf_gone
    );
    expect(row?.workflowName).toBe('Workflow inconnu');
    // No graph to resolve the node id → currentNodeType comes from the channel.
    expect(row?.currentNodeType).toBe('sms');
  });

  it('falls back to the log channel when the node id is missing from the graph', () => {
    const [row] = derivePatients(
      [log({ patientId: 'pat_v.v_0005', nodeId: 'deleted-node', channel: 'whatsapp' })],
      [workflow],
    );
    expect(row?.currentNodeType).toBe('whatsapp');
  });

  // --- ADR-006: status reads the LAST log, not the whole failure history. ---

  it('classes failed-then-recovered-to-the-end as termine, not bloque (ticket case)', () => {
    // Old failure on `email`, then recovered all the way to the last channel
    // `sms` (only `end` after it). The stale failure must be ignored → termine.
    const [row] = derivePatients(
      [
        log({
          patientId: 'pat_c.c_0008',
          nodeId: 'sms',
          status: 'sent',
          occurredAt: new Date('2026-05-20'),
        }),
        log({
          patientId: 'pat_c.c_0008',
          nodeId: 'email',
          status: 'failed',
          occurredAt: new Date('2026-05-10'),
        }),
      ],
      [workflow],
    );
    expect(row?.status).toBe('termine');
  });

  it('does not blame an old failure when the last log is sent and a channel is still ahead', () => {
    // The residual defect of the previous rule: a stale failure with the last
    // log `sent` and `sms` still reachable downstream → en_cours, never bloque.
    const [row] = derivePatients(
      [
        log({
          patientId: 'pat_r.r_0006',
          nodeId: 'email',
          status: 'sent',
          occurredAt: new Date('2026-05-20'),
        }),
        log({
          patientId: 'pat_r.r_0006',
          nodeId: 'email',
          status: 'failed',
          occurredAt: new Date('2026-05-10'),
        }),
      ],
      [workflow],
    );
    expect(row?.status).toBe('en_cours');
  });

  it('keeps a pending on the journey’s final channel en_cours (pending beats "no downstream")', () => {
    // `sms` is the last channel (only `end` after it): hasDownstreamChannel is
    // false, but a pending relance there means the patient is still moving.
    const [row] = derivePatients(
      [log({ patientId: 'pat_p.p_0007', nodeId: 'sms', status: 'pending' })],
      [workflow],
    );
    expect(row?.status).toBe('en_cours');
  });
});

describe('countRelancesInLastDays', () => {
  it('counts only sent/failed logs within the window', () => {
    const recent = new Date();
    const old = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const count = countRelancesInLastDays(
      [
        log({ patientId: 'p', status: 'sent', occurredAt: recent }),
        log({ patientId: 'p', status: 'failed', occurredAt: recent }),
        log({ patientId: 'p', status: 'pending', occurredAt: recent }), // scheduled, not a relance
        log({ patientId: 'p', status: 'sent', occurredAt: old }), // out of window
      ],
      7,
    );
    expect(count).toBe(2);
  });
});
