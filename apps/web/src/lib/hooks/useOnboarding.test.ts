import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ONBOARDING_STORAGE_KEY, useOnboarding } from './useOnboarding';

afterEach(() => {
  localStorage.clear();
});

describe('useOnboarding', () => {
  it('auto-opens on mount when no completion flag exists', () => {
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.isOpen).toBe(true);
  });

  it('stays closed on mount when the completion flag is present', () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.isOpen).toBe(false);
  });

  it('open() reopens the dialog on demand', () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.isOpen).toBe(false);

    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);
  });

  it('markCompleted() persists the flag and closes', () => {
    const { result } = renderHook(() => useOnboarding());

    act(() => result.current.markCompleted());

    expect(result.current.isOpen).toBe(false);
    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe('true');
  });
});
