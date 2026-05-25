import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createWorkflow,
  deleteWorkflow,
  getWorkflow,
  listWorkflows,
  updateWorkflow,
} from './workflows';

// Mock the fetch wrapper: these functions are thin path/method/schema bindings,
// so we assert *what request they issue*, not the network round-trip (covered
// by client.test.ts).
const apiFetch = vi.fn<(...args: unknown[]) => Promise<unknown>>(() => Promise.resolve(undefined));
vi.mock('./client', () => ({ apiFetch: (...args: unknown[]) => apiFetch(...args) }));

afterEach(() => {
  apiFetch.mockClear();
});

describe('workflows API', () => {
  it('listWorkflows GETs /workflows', async () => {
    await listWorkflows();
    expect(apiFetch.mock.calls[0]?.[0]).toBe('/workflows');
    expect(apiFetch.mock.calls[0]?.[1]).toEqual({ method: 'GET' });
  });

  it('getWorkflow GETs the workflow by id', async () => {
    await getWorkflow('wf_1');
    expect(apiFetch.mock.calls[0]?.[0]).toBe('/workflows/wf_1');
    expect(apiFetch.mock.calls[0]?.[1]).toEqual({ method: 'GET' });
  });

  it('createWorkflow POSTs a JSON-serialised payload', async () => {
    const payload = {
      name: 'Relance',
      graph: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
      settings: { notificationEmail: 'a@b.fr' },
    };
    await createWorkflow(payload);
    expect(apiFetch.mock.calls[0]?.[0]).toBe('/workflows');
    expect(apiFetch.mock.calls[0]?.[1]).toEqual({
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });

  it('updateWorkflow PATCHes the workflow by id', async () => {
    await updateWorkflow('wf_1', { name: 'Renommé' });
    expect(apiFetch.mock.calls[0]?.[0]).toBe('/workflows/wf_1');
    expect(apiFetch.mock.calls[0]?.[1]).toEqual({
      method: 'PATCH',
      body: JSON.stringify({ name: 'Renommé' }),
    });
  });

  it('deleteWorkflow DELETEs the workflow by id', async () => {
    await deleteWorkflow('wf_1');
    expect(apiFetch.mock.calls[0]?.[0]).toBe('/workflows/wf_1');
    expect(apiFetch.mock.calls[0]?.[1]).toEqual({ method: 'DELETE' });
  });
});
