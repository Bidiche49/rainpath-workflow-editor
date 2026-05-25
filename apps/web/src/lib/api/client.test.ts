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

  it('accepts an empty body against z.void()', async () => {
    // jsdom forbids constructing a 204 Response, so use a 200 with an empty
    // body — the wrapper path is identical: readBody returns undefined.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('', { status: 200 }))),
    );

    await expect(
      apiFetch('/workflows/wf_1', { method: 'DELETE' }, z.void()),
    ).resolves.toBeUndefined();
  });

  it('joins a NestJS string[] message into a single error message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ message: ['name required', 'graph invalid'] }), {
            status: 400,
          }),
        ),
      ),
    );

    let thrown: unknown;
    try {
      await apiFetch('/workflows', { method: 'POST' }, z.object({ id: z.string() }));
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ApiError);
    if (thrown instanceof ApiError) {
      expect(thrown.message).toBe('name required, graph invalid');
      // No `errors` field present → structured details are undefined.
      expect(thrown.errors).toBeUndefined();
    }
  });

  it('treats an empty errors array as no structured details', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ message: 'Bad', errors: [] }), { status: 422 }),
        ),
      ),
    );

    let thrown: unknown;
    try {
      await apiFetch('/workflows', { method: 'POST' }, z.object({ id: z.string() }));
    } catch (error) {
      thrown = error;
    }

    expect((thrown as ApiError).errors).toBeUndefined();
  });

  it('falls back to a generic message when the error body is not valid JSON', async () => {
    // status 500 with a malformed body and no statusText → readBody swallows the
    // JSON.parse failure, extractMessage hits its final fallback.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('<<not json>>', { status: 500 }))),
    );

    let thrown: unknown;
    try {
      await apiFetch('/workflows', { method: 'GET' }, z.object({ id: z.string() }));
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ApiError);
    expect((thrown as ApiError).status).toBe(500);
    expect((thrown as ApiError).message.length).toBeGreaterThan(0);
  });
});
