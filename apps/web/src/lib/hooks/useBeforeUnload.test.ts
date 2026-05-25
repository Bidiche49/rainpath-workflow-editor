import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useBeforeUnload } from './useBeforeUnload';

const addSpy = vi.spyOn(window, 'addEventListener');
const removeSpy = vi.spyOn(window, 'removeEventListener');

afterEach(() => {
  vi.clearAllMocks();
});

describe('useBeforeUnload', () => {
  it('attaches a beforeunload listener when enabled (dirty)', () => {
    renderHook(() => useBeforeUnload(true));
    expect(addSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  it('attaches no listener when disabled (clean)', () => {
    renderHook(() => useBeforeUnload(false));
    expect(addSpy).not.toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  it('detaches the listener on unmount', () => {
    const { unmount } = renderHook(() => useBeforeUnload(true));
    const handler = addSpy.mock.calls.find(([type]) => type === 'beforeunload')?.[1];

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('beforeunload', handler);
  });
});
