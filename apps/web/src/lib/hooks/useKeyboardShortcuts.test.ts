import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useKeyboardShortcuts } from './useKeyboardShortcuts';

function press(key: string, options: KeyboardEventInit = {}, target: EventTarget = window) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options });
  target.dispatchEvent(event);
  return event;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('useKeyboardShortcuts', () => {
  it('calls the save handler and prevents default on Cmd/Ctrl+S', () => {
    const save = vi.fn();
    renderHook(() => useKeyboardShortcuts({ 'mod+s': save }));

    const metaEvent = press('s', { metaKey: true });
    const ctrlEvent = press('s', { ctrlKey: true });

    expect(save).toHaveBeenCalledTimes(2);
    expect(metaEvent.defaultPrevented).toBe(true);
    expect(ctrlEvent.defaultPrevented).toBe(true);
  });

  it('calls Delete (also on Backspace) and Escape handlers', () => {
    const deleteSelected = vi.fn();
    const deselect = vi.fn();
    renderHook(() => useKeyboardShortcuts({ Delete: deleteSelected, Escape: deselect }));

    press('Delete');
    press('Backspace');
    press('Escape');

    expect(deleteSelected).toHaveBeenCalledTimes(2);
    expect(deselect).toHaveBeenCalledTimes(1);
  });

  it('ignores Delete and Escape while a form field is focused', () => {
    const deleteSelected = vi.fn();
    const deselect = vi.fn();
    renderHook(() => useKeyboardShortcuts({ Delete: deleteSelected, Escape: deselect }));

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    press('Delete', {}, input);
    press('Escape', {}, input);

    expect(deleteSelected).not.toHaveBeenCalled();
    expect(deselect).not.toHaveBeenCalled();
  });

  it('removes the listener on unmount', () => {
    const save = vi.fn();
    const { unmount } = renderHook(() => useKeyboardShortcuts({ 'mod+s': save }));

    unmount();
    press('s', { metaKey: true });

    expect(save).not.toHaveBeenCalled();
  });
});
