import type { NodeType } from '@rainpath/schemas';

/**
 * Static class helpers for the project's design tokens (B-00).
 *
 * Every helper returns *literal* Tailwind class strings through an exhaustive
 * switch — never a templated string like `bg-channel-${type}-50`. This is
 * deliberate: Tailwind's content scanner only keeps classes it can find as
 * whole strings, so templated names would be purged from the production build.
 *
 * The class names reference the `channel` / `status` / `exec` palettes declared
 * in `tailwind.config.ts`, which is the single source of truth for the hex
 * values. Consumers (B-02 custom nodes, Phase 2 dashboard) call these helpers
 * instead of hardcoding colours.
 */

/** Border / background / text / ring classes for a node of a given type. */
export interface ChannelStyles {
  border: string;
  bg: string;
  text: string;
  ring: string;
  /** Solid -500 fill for the icon chip/pastille (paired with `text-white`). */
  chip: string;
  /** Solid -500 border, paired with `chip` for connected handles (B-03/I-07). */
  solidBorder: string;
}

/** Badge classes (tinted fill + solid text + subtle border) for a log status. */
export interface StatusBadgeStyles {
  bg: string;
  text: string;
  border: string;
}

/** Highlight ring classes for a node's runtime execution state. */
export interface ExecRingStyles {
  ring: string;
}

/**
 * Action-log lifecycle, presentation layer only.
 *
 * NOTE: this intentionally diverges from the persisted `ActionStatus` enum
 * (`pending | sent | failed | skipped`) in `@rainpath/schemas`. These are the
 * richer delivery-lifecycle states the UI displays; mapping from `ActionStatus`
 * to `LogStatus` (if needed) belongs to the consuming component, not here.
 */
export type LogStatus = 'sent' | 'delivered' | 'opened' | 'rejected' | 'scheduled';

/** Node runtime state used by the read-only patient preview highlight ring. */
export type ExecState = 'idle' | 'pending' | 'done' | 'blocked';

/** Compile-time guarantee that a switch is exhaustive over its union. */
function assertNever(value: never): never {
  throw new Error(`Unhandled design-token variant: ${String(value)}`);
}

/**
 * Maps a node type to its border/bg/text/ring classes from the `channel`
 * palette. `channel.email` resolves to the blue family (border-blue-400 /
 * bg-blue-50 / text-blue-700 / ring-blue-500 hex values), and so on per type.
 */
export function getChannelStyles(channel: NodeType): ChannelStyles {
  switch (channel) {
    case 'start':
      return {
        border: 'border-channel-start-400',
        bg: 'bg-channel-start-50',
        text: 'text-channel-start-700',
        ring: 'ring-channel-start-500',
        chip: 'bg-channel-start-500',
        solidBorder: 'border-channel-start-500',
      };
    case 'email':
      return {
        border: 'border-channel-email-400',
        bg: 'bg-channel-email-50',
        text: 'text-channel-email-700',
        ring: 'ring-channel-email-500',
        chip: 'bg-channel-email-500',
        solidBorder: 'border-channel-email-500',
      };
    case 'sms':
      return {
        border: 'border-channel-sms-400',
        bg: 'bg-channel-sms-50',
        text: 'text-channel-sms-700',
        ring: 'ring-channel-sms-500',
        chip: 'bg-channel-sms-500',
        solidBorder: 'border-channel-sms-500',
      };
    case 'whatsapp':
      return {
        border: 'border-channel-whatsapp-400',
        bg: 'bg-channel-whatsapp-50',
        text: 'text-channel-whatsapp-700',
        ring: 'ring-channel-whatsapp-500',
        chip: 'bg-channel-whatsapp-500',
        solidBorder: 'border-channel-whatsapp-500',
      };
    case 'letter':
      return {
        border: 'border-channel-letter-400',
        bg: 'bg-channel-letter-50',
        text: 'text-channel-letter-700',
        ring: 'ring-channel-letter-500',
        chip: 'bg-channel-letter-500',
        solidBorder: 'border-channel-letter-500',
      };
    case 'wait':
      return {
        border: 'border-channel-wait-400',
        bg: 'bg-channel-wait-50',
        text: 'text-channel-wait-700',
        ring: 'ring-channel-wait-500',
        chip: 'bg-channel-wait-500',
        solidBorder: 'border-channel-wait-500',
      };
    case 'condition':
      return {
        border: 'border-channel-condition-400',
        bg: 'bg-channel-condition-50',
        text: 'text-channel-condition-700',
        ring: 'ring-channel-condition-500',
        chip: 'bg-channel-condition-500',
        solidBorder: 'border-channel-condition-500',
      };
    case 'end':
      return {
        border: 'border-channel-end-400',
        bg: 'bg-channel-end-50',
        text: 'text-channel-end-700',
        ring: 'ring-channel-end-500',
        chip: 'bg-channel-end-500',
        solidBorder: 'border-channel-end-500',
      };
    default:
      return assertNever(channel);
  }
}

/** Maps a log status to its badge classes from the `status` palette. */
export function getStatusBadgeStyles(status: LogStatus): StatusBadgeStyles {
  switch (status) {
    case 'sent':
      return { bg: 'bg-status-sent/10', text: 'text-status-sent', border: 'border-status-sent/20' };
    case 'delivered':
      return {
        bg: 'bg-status-delivered/10',
        text: 'text-status-delivered',
        border: 'border-status-delivered/20',
      };
    case 'opened':
      return {
        bg: 'bg-status-opened/10',
        text: 'text-status-opened',
        border: 'border-status-opened/20',
      };
    case 'rejected':
      return {
        bg: 'bg-status-rejected/10',
        text: 'text-status-rejected',
        border: 'border-status-rejected/20',
      };
    case 'scheduled':
      return {
        bg: 'bg-status-scheduled/10',
        text: 'text-status-scheduled',
        border: 'border-status-scheduled/20',
      };
    default:
      return assertNever(status);
  }
}

/** Maps a runtime exec state to its highlight ring classes from the `exec` palette. */
export function getExecRingStyles(exec: ExecState): ExecRingStyles {
  switch (exec) {
    case 'idle':
      return { ring: 'ring-1 ring-exec-idle' };
    case 'pending':
      return { ring: 'ring-2 ring-exec-pending' };
    case 'done':
      return { ring: 'ring-2 ring-exec-done' };
    case 'blocked':
      return { ring: 'ring-2 ring-exec-blocked' };
    default:
      return assertNever(exec);
  }
}
