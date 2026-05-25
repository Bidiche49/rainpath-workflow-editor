import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useBackNavigation } from './useBackNavigation';

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));

/** Override the read-only `window.history.length` for a test. */
function setHistoryLength(length: number) {
  Object.defineProperty(window.history, 'length', { value: length, configurable: true });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('useBackNavigation', () => {
  it('goes back in the browser history when there is something to pop', () => {
    setHistoryLength(3);
    const { result } = renderHook(() => useBackNavigation('/workflows'));
    result.current();
    expect(navigate).toHaveBeenCalledWith(-1);
  });

  it('navigates to the fallback route when history is empty (direct link)', () => {
    setHistoryLength(1);
    const { result } = renderHook(() => useBackNavigation('/'));
    result.current();
    expect(navigate).toHaveBeenCalledWith('/');
  });
});
