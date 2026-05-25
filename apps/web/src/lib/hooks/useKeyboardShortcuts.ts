import { useEffect, useRef } from 'react';

/**
 * Editor keyboard shortcuts. Keys map to handlers:
 * - `mod+s`  — Cmd/Ctrl+S (save). Always handled, even while typing, and the
 *   browser's native "save page" is suppressed.
 * - `Delete` — Del or Backspace (delete selection). Ignored while a form field
 *   is focused, so deleting text never deletes the selected node.
 * - `Escape` — deselect. Also ignored in form fields (the field handles its own
 *   escape, e.g. cancelling inline rename).
 */
export interface ShortcutHandlers {
  'mod+s'?: () => void;
  Delete?: () => void;
  Escape?: () => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers): void {
  // Keep the latest handlers in a ref so the listener is bound once and never
  // captures a stale closure.
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        handlersRef.current['mod+s']?.();
        return;
      }

      if (isEditableTarget(event.target)) return;

      if (event.key === 'Delete' || event.key === 'Backspace') {
        handlersRef.current.Delete?.();
        return;
      }

      if (event.key === 'Escape') {
        handlersRef.current.Escape?.();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
