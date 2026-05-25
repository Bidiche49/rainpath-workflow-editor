import { useEffect } from 'react';

/**
 * Warns before the browser tab/window closes (or reloads) while there are
 * unsaved changes. The `beforeunload` listener is attached only while
 * `enabled` is true and removed as soon as it flips false or the component
 * unmounts — so a clean editor never triggers the native prompt.
 *
 * Per the HTML5 spec, showing the prompt requires both `preventDefault()` and
 * assigning a string to `returnValue`. The browser renders its own generic
 * message; the assigned string is ignored by modern engines but still required.
 */
export function useBeforeUnload(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [enabled]);
}
