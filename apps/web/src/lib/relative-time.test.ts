import { describe, expect, it } from 'vitest';

import { formatRelativeTime } from './relative-time';

// Compare against a reference formatter built with the *same* Intl options, so
// assertions check the picked unit/value (the actual logic) without being
// brittle to the host's exact French wording.
const ref = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function ago(ms: number): Date {
  return new Date(Date.now() - ms);
}

describe('formatRelativeTime', () => {
  it('picks the year unit beyond ~365 days', () => {
    expect(formatRelativeTime(ago(2 * 365 * DAY))).toBe(ref.format(-2, 'year'));
  });

  it('picks the month unit between 30 and 365 days', () => {
    expect(formatRelativeTime(ago(3 * 30 * DAY))).toBe(ref.format(-3, 'month'));
  });

  it('picks the day unit between 1 and 30 days', () => {
    expect(formatRelativeTime(ago(2 * DAY))).toBe(ref.format(-2, 'day'));
  });

  it('picks the hour unit between 1 and 24 hours', () => {
    expect(formatRelativeTime(ago(5 * HOUR))).toBe(ref.format(-5, 'hour'));
  });

  it('picks the minute unit between 1 and 60 minutes', () => {
    expect(formatRelativeTime(ago(10 * MINUTE))).toBe(ref.format(-10, 'minute'));
  });

  it('falls back to seconds under one minute', () => {
    expect(formatRelativeTime(ago(5 * SECOND))).toBe(ref.format(-5, 'second'));
  });

  it('handles a future date (positive sign)', () => {
    const future = new Date(Date.now() + 3 * DAY);
    expect(formatRelativeTime(future)).toBe(ref.format(3, 'day'));
  });
});
