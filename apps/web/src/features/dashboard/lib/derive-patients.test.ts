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
      { id: 'end', type: 'end', position: { x: 0, y: 0 }, data: {} },
    ],
    edges: [],
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

  it('flags a patient with any failed relance as bloque', () => {
    const [row] = derivePatients(
      [
        log({ patientId: 'pat_x.x_0001', status: 'pending', occurredAt: new Date('2026-05-20') }),
        log({ patientId: 'pat_x.x_0001', status: 'failed', occurredAt: new Date('2026-05-10') }),
      ],
      [workflow],
    );
    expect(row?.status).toBe('bloque');
  });

  it('flags a patient who reached an end node as termine (over a failure)', () => {
    const [row] = derivePatients(
      [
        log({ patientId: 'pat_y.y_0002', nodeId: 'end', occurredAt: new Date('2026-05-20') }),
        log({ patientId: 'pat_y.y_0002', status: 'failed', occurredAt: new Date('2026-05-10') }),
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
