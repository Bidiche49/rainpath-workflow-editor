import { describe, expect, it } from 'vitest';

import {
  getChannelStyles,
  getExecRingStyles,
  getStatusBadgeStyles,
  type ExecState,
  type LogStatus,
} from './design-tokens';

describe('getChannelStyles', () => {
  it('maps the email node to the blue (channel-email) family classes', () => {
    // channel.email resolves to the blue scale: 400 / 50 / 700 / 500.
    expect(getChannelStyles('email')).toEqual({
      border: 'border-channel-email-400',
      bg: 'bg-channel-email-50',
      text: 'text-channel-email-700',
      ring: 'ring-channel-email-500',
      chip: 'bg-channel-email-500',
    });
  });

  it('returns static, non-templated classes for every node type', () => {
    const types = [
      'start',
      'end',
      'email',
      'sms',
      'whatsapp',
      'letter',
      'wait',
      'condition',
    ] as const;
    for (const type of types) {
      const styles = getChannelStyles(type);
      expect(styles.bg).toBe(`bg-channel-${type}-50`);
      expect(styles.chip).toBe(`bg-channel-${type}-500`);
      // no leftover template syntax leaked into the class strings
      expect(styles.text).not.toContain('${');
    }
  });
});

describe('getStatusBadgeStyles', () => {
  it('maps a log status to tinted badge classes', () => {
    expect(getStatusBadgeStyles('delivered')).toEqual({
      bg: 'bg-status-delivered/10',
      text: 'text-status-delivered',
      border: 'border-status-delivered/20',
    });
  });

  it('returns static, exhaustive classes for every log status', () => {
    const statuses: LogStatus[] = ['sent', 'delivered', 'opened', 'rejected', 'scheduled'];
    for (const status of statuses) {
      const styles = getStatusBadgeStyles(status);
      expect(styles.bg).toBe(`bg-status-${status}/10`);
      expect(styles.text).toBe(`text-status-${status}`);
      expect(styles.border).toBe(`border-status-${status}/20`);
    }
  });
});

describe('getExecRingStyles', () => {
  it('maps a runtime exec state to a highlight ring', () => {
    expect(getExecRingStyles('blocked')).toEqual({ ring: 'ring-2 ring-exec-blocked' });
  });

  it('returns a ring class for every exec state (idle is thinner)', () => {
    const states: ExecState[] = ['idle', 'pending', 'done', 'blocked'];
    for (const state of states) {
      expect(getExecRingStyles(state).ring).toBe(
        `ring-${state === 'idle' ? 1 : 2} ring-exec-${state}`,
      );
    }
  });
});
