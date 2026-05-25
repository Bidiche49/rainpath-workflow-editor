import { afterEach, describe, expect, it, vi } from 'vitest';

import { createActionLog, listActionLogs, listAllActionLogs } from './action-logs';

const apiFetch = vi.fn<(...args: unknown[]) => Promise<unknown>>(() => Promise.resolve(undefined));
vi.mock('./client', () => ({ apiFetch: (...args: unknown[]) => apiFetch(...args) }));

afterEach(() => {
  apiFetch.mockClear();
});

describe('action-logs API', () => {
  it('listAllActionLogs GETs /action-logs without a filter', async () => {
    await listAllActionLogs();
    expect(apiFetch.mock.calls[0]?.[0]).toBe('/action-logs');
    expect(apiFetch.mock.calls[0]?.[1]).toEqual({ method: 'GET' });
  });

  it('listActionLogs encodes the patientId as a query param', async () => {
    await listActionLogs('pat_a.a_1111');
    expect(apiFetch.mock.calls[0]?.[0]).toBe('/action-logs?patientId=pat_a.a_1111');
    expect(apiFetch.mock.calls[0]?.[1]).toEqual({ method: 'GET' });
  });

  it('createActionLog POSTs a JSON-serialised payload', async () => {
    const payload = {
      patientId: 'pat_a.a_1111',
      workflowId: 'wf_1',
      nodeId: 'email',
      channel: 'email' as const,
      status: 'sent' as const,
      occurredAt: new Date('2026-05-20'),
    };
    await createActionLog(payload);
    expect(apiFetch.mock.calls[0]?.[0]).toBe('/action-logs');
    expect(apiFetch.mock.calls[0]?.[1]).toEqual({
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });
});
