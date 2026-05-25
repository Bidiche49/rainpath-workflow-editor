import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { ApiError, apiFetch } from './client';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiFetch', () => {
  it('throws ApiError with status, message and field errors on a 4xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              message: 'Validation failed',
              errors: [{ path: 'name', message: 'Required' }],
            }),
            { status: 400 },
          ),
        ),
      ),
    );

    const schema = z.object({ id: z.string() });

    let thrown: unknown;
    try {
      await apiFetch('/workflows', { method: 'GET' }, schema);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ApiError);
    if (thrown instanceof ApiError) {
      expect(thrown.status).toBe(400);
      expect(thrown.message).toBe('Validation failed');
      expect(thrown.errors).toEqual([{ path: 'name', message: 'Required' }]);
    }
  });

  it('parses the JSON body with the provided schema on a 2xx response', async () => {
    const payload = { id: 'wf_1', name: 'Relance standard' };
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(JSON.stringify(payload), { status: 200 }))),
    );

    const schema = z.object({ id: z.string(), name: z.string() });
    const result = await apiFetch('/workflows/wf_1', { method: 'GET' }, schema);

    expect(result).toEqual(payload);
  });
});
