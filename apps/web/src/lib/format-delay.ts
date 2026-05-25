import type { Delay } from '@rainpath/schemas';

/** Singular / plural French label for each wait unit. */
const UNIT_LABELS: Record<Delay['unit'], { one: string; many: string }> = {
  days: { one: 'jour', many: 'jours' },
  hours: { one: 'heure', many: 'heures' },
  minutes: { one: 'minute', many: 'minutes' },
};

/**
 * Formats a wait `Delay` as a localized French string, e.g. `{ value: 3,
 * unit: 'days' }` → "3 jours", `{ value: 1, unit: 'heure' }` → "1 heure".
 * Pure helper (no React) so it is unit-testable and reusable across views.
 */
export function formatDelay(delay: Delay): string {
  const labels = UNIT_LABELS[delay.unit];
  return `${delay.value} ${delay.value <= 1 ? labels.one : labels.many}`;
}
