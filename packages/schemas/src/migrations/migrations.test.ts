import { describe, expect, it, vi } from 'vitest';

import { applyMigrations } from './index';

describe('applyMigrations', () => {
  it('returns the graph unchanged when already at the target version', () => {
    const graph = { marker: 'v1' };
    expect(applyMigrations(graph, 1, 1, {})).toBe(graph);
  });

  it('chains every registered step from source to target', () => {
    const step1 = vi.fn(() => ({ v: 2 }));
    const step2 = vi.fn(() => ({ v: 3 }));

    const result = applyMigrations({ v: 1 }, 1, 3, { 1: step1, 2: step2 });

    expect(step1).toHaveBeenCalledWith({ v: 1 });
    expect(step2).toHaveBeenCalledWith({ v: 2 });
    expect(result).toEqual({ v: 3 });
  });

  it('throws when a migration step is missing', () => {
    expect(() => applyMigrations({}, 1, 2, {})).toThrow(/missing migration step/);
  });

  it('throws when the stored version is newer than the target', () => {
    expect(() => applyMigrations({}, 5, 1, {})).toThrow(/newer than supported/);
  });
});
