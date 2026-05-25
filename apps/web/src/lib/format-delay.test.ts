import { describe, expect, it } from 'vitest';

import { formatDelay } from './format-delay';

describe('formatDelay', () => {
  it('formats a single day in the singular', () => {
    expect(formatDelay({ value: 1, unit: 'days' })).toBe('1 jour');
  });

  it('formats multiple days in the plural', () => {
    expect(formatDelay({ value: 3, unit: 'days' })).toBe('3 jours');
  });

  it('formats a single hour in the singular', () => {
    expect(formatDelay({ value: 1, unit: 'hours' })).toBe('1 heure');
  });

  it('formats multiple hours in the plural', () => {
    expect(formatDelay({ value: 6, unit: 'hours' })).toBe('6 heures');
  });

  it('formats a single minute in the singular', () => {
    expect(formatDelay({ value: 1, unit: 'minutes' })).toBe('1 minute');
  });

  it('formats multiple minutes in the plural', () => {
    expect(formatDelay({ value: 30, unit: 'minutes' })).toBe('30 minutes');
  });
});
