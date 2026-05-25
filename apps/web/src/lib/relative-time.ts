const RELATIVE_FORMAT = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });

/** Largest-fitting unit and its threshold in seconds. */
const DIVISIONS: ReadonlyArray<{ unit: Intl.RelativeTimeFormatUnit; seconds: number }> = [
  { unit: 'year', seconds: 60 * 60 * 24 * 365 },
  { unit: 'month', seconds: 60 * 60 * 24 * 30 },
  { unit: 'day', seconds: 60 * 60 * 24 },
  { unit: 'hour', seconds: 60 * 60 },
  { unit: 'minute', seconds: 60 },
];

/**
 * Human-friendly relative date in French ("il y a 2 jours", "à l'instant").
 * Uses `Intl.RelativeTimeFormat` with `numeric: 'auto'`, picking the largest
 * unit that fits the elapsed time.
 */
export function formatRelativeTime(date: Date): string {
  const diffSeconds = (date.getTime() - Date.now()) / 1000;
  const absSeconds = Math.abs(diffSeconds);

  for (const { unit, seconds } of DIVISIONS) {
    if (absSeconds >= seconds) {
      return RELATIVE_FORMAT.format(Math.round(diffSeconds / seconds), unit);
    }
  }
  return RELATIVE_FORMAT.format(Math.round(diffSeconds), 'second');
}
