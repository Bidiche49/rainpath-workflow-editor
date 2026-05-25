import { memo, type ReactNode } from 'react';

import { Handle, Position } from '@xyflow/react';
import { AlertTriangle, Bell, type LucideIcon } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getChannelStyles } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

import type { NodeStatus, NodeType } from '@rainpath/schemas';

/** Small coloured dot mirroring a node's runtime status (preview mode). */
const STATUS_DOT: Record<NodeStatus, string> = {
  pending: 'bg-slate-300',
  current: 'bg-blue-500 animate-pulse',
  done: 'bg-green-500',
};

export interface NotifyIndicator {
  /** `data.notifySecretariat` — drives the discreet Bell. */
  enabled: boolean;
  /** `data.notificationEmailOverride` — drives the orange AlertTriangle. */
  override?: string | undefined;
}

/** Bell / AlertTriangle overlay shown on action nodes (ADR-004). */
function NotifBadge({ enabled, override }: NotifyIndicator) {
  if (override) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              data-testid="notif-override"
              className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-orange-200 bg-white shadow-sm"
            >
              <AlertTriangle size={11} className="text-orange-500" />
            </span>
          </TooltipTrigger>
          <TooltipContent>Notification vers une adresse personnalisée : {override}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  if (enabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              data-testid="notif-default"
              className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm"
            >
              <Bell size={10} className="text-slate-400" />
            </span>
          </TooltipTrigger>
          <TooltipContent>Le secrétariat est notifié à chaque déclenchement</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return null;
}

export interface NodeShellProps {
  type: NodeType;
  icon: LucideIcon;
  label: string;
  selected?: boolean | undefined;
  status?: NodeStatus | undefined;
  /** Target handle on top (every node except Start). */
  hasTarget?: boolean;
  /** Single source handle on the bottom (every node except End and Condition). */
  hasSource?: boolean;
  /** Notification indicators (action nodes only). */
  notify?: NotifyIndicator | undefined;
  /** Extra handles rendered by the node itself (Condition's yes/no branches). */
  children?: ReactNode;
}

/**
 * Shared "chunky" node card (B-02 visual spec). Colours come exclusively from
 * the static `getChannelStyles` helper — never a templated class — so Tailwind
 * keeps them in the production build.
 */
function NodeShellComponent({
  type,
  icon: Icon,
  label,
  selected,
  status,
  hasTarget = true,
  hasSource = true,
  notify,
  children,
}: NodeShellProps) {
  const styles = getChannelStyles(type);
  return (
    <div
      className={cn(
        'relative min-w-[200px] rounded-xl border-2 p-3 shadow-sm transition-shadow hover:shadow-md',
        styles.border,
        styles.bg,
        selected && cn('ring-2', styles.ring),
      )}
    >
      {hasTarget && <Handle type="target" position={Position.Top} />}

      <div className="flex items-center gap-2.5">
        <span className={cn('rounded-lg p-2 text-white', styles.chip)}>
          <Icon size={16} />
        </span>
        <span className={cn('text-[13px] font-medium', styles.text)}>{label}</span>
      </div>

      {status && (
        <span
          data-testid="status-dot"
          className={cn('absolute right-2 top-2 h-2 w-2 rounded-full', STATUS_DOT[status])}
        />
      )}

      {notify && <NotifBadge {...notify} />}

      {hasSource && <Handle type="source" position={Position.Bottom} />}

      {children}
    </div>
  );
}

export const NodeShell = memo(NodeShellComponent);
