import { useCallback, useEffect, useState } from 'react';

/** localStorage flag set once the user has seen (or skipped) the onboarding. */
export const ONBOARDING_STORAGE_KEY = 'rainpath:onboarding-completed';

export interface UseOnboardingResult {
  /** Whether the onboarding dialog is currently open. */
  isOpen: boolean;
  /** Reopen the onboarding on demand (e.g. the topbar "?" button). */
  open: () => void;
  /** Close without persisting — the dialog will reopen on next first visit. */
  close: () => void;
  /** Persist completion and close — the dialog won't auto-open again. */
  markCompleted: () => void;
}

/**
 * Drives the first-visit onboarding modal. On mount it opens automatically when
 * no completion flag exists in localStorage; afterwards it can be reopened on
 * demand. `markCompleted` writes the flag so the auto-open never fires again.
 */
export function useOnboarding(): UseOnboardingResult {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!completed) setIsOpen(true);
  }, []);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const markCompleted = useCallback(() => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    setIsOpen(false);
  }, []);

  return { isOpen, open, close, markCompleted };
}
