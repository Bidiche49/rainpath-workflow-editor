import { memo, type CSSProperties, type ReactNode } from 'react';

import { Handle, Position, useStore, type HandleType } from '@xyflow/react';
import { AlertCircle, AlertTriangle, Bell, Trash2, type LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getChannelStyles, getExecRingStyles, type ExecState } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

import type { NodeStatus, NodeType } from '@rainpath/schemas';

import { useNodeActions } from './node-actions-context';

/** Small coloured dot mirroring a node's runtime status (preview mode). */
const STATUS_DOT: Record<NodeStatus, string> = {
  pending: 'bg-slate-300',
  current: 'bg-blue-500 animate-pulse',
  done: 'bg-green-500',
};

/**
 * Bridges the canonical `NodeStatus` (persisted) to the `ExecState` palette
 * used by `getExecRingStyles` — the patient preview highlights nodes with a
 * coloured ring on top of the status dot.
 */
const NODE_STATUS_TO_EXEC: Record<NodeStatus, ExecState> = {
  pending: 'idle',
  current: 'pending',
  done: 'done',
};

export interface NotifyIndicator {
  /** `data.notifySecretariat` — drives the discreet Bell. */
  enabled: boolean;
  /** `data.notificationEmailOverride` — drives the orange AlertTriangle. */
  override?: string | undefined;
}

/**
 * Bell / AlertTriangle overlay shown on action nodes (ADR-004). Positioned on
 * the channel pastille's corner (top-left of the card) so it never collides
 * with the validation badge, which owns the card's top-right corner (I-06).
 */
function NotifBadge({ enabled, override }: NotifyIndicator) {
  if (override) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              data-testid="notif-override"
              className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-orange-200 bg-white shadow-sm"
            >
              <AlertTriangle size={10} className="text-orange-500" />
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
              className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm"
            >
              <Bell size={9} className="text-slate-400" />
            </span>
          </TooltipTrigger>
          <TooltipContent>Le secrétariat est notifié à chaque déclenchement</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return null;
}

/** Per-node coherence indicator (I-06): error (red) or warning (amber). */
export interface NodeValidation {
  type: 'error' | 'warning';
  message: string;
}

/** AlertCircle / AlertTriangle badge on the card's top-right corner. */
function ValidationBadge({ type, message }: NodeValidation) {
  const isError = type === 'error';
  const Icon = isError ? AlertCircle : AlertTriangle;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            data-testid={`validation-${type}`}
            className={cn(
              'absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border bg-white shadow-sm',
              isError ? 'border-red-200 text-red-600' : 'border-amber-200 text-amber-600',
            )}
          >
            <Icon size={12} />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-[240px] whitespace-pre-line">{message}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Quick-delete affordance (I-07 batch 2): a trash button on the card's
 * top-left corner, revealed only on hover. It sits on the left so it never
 * collides with the validation badge / notification pastille on the right.
 * Hidden in read-only preview.
 */
function TrashButton({ nodeId }: { nodeId: string }) {
  const { onRemoveNode } = useNodeActions();
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Supprimer ce nœud"
            // `nodrag` stops React Flow from starting a node drag on press.
            className="nodrag absolute -left-2 -top-2 z-10 h-7 w-7 rounded-full border bg-white opacity-0 shadow-sm transition-opacity duration-150 hover:border-red-300 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
            onClick={(event) => {
              event.stopPropagation();
              onRemoveNode?.(nodeId);
            }}
          >
            <Trash2 size={14} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Supprimer ce nœud</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Whether a given handle currently has at least one edge attached. Reads the
 * live edge list from React Flow's store with a boolean selector, so a node
 * only re-renders when its own connection state flips (not on every edge edit).
 */
function useHandleConnected(
  nodeId: string | undefined,
  handleType: HandleType,
  handleId?: string,
): boolean {
  return useStore((store) =>
    nodeId === undefined
      ? false
      : store.edges.some((edge) =>
          handleType === 'source'
            ? edge.source === nodeId &&
              (handleId === undefined || (edge.sourceHandle ?? undefined) === handleId)
            : edge.target === nodeId &&
              (handleId === undefined || (edge.targetHandle ?? undefined) === handleId),
        ),
  );
}

export interface StyledHandleProps {
  nodeId: string | undefined;
  handleType: HandleType;
  position: Position;
  /** Branch id for condition outputs ("yes"/"no"); omitted for linear handles. */
  id?: string;
  /** Border colour class (channel-500, or emerald/red for condition branches). */
  borderClass: string;
  /** Fill class applied once the handle is connected. */
  fillClass: string;
  style?: CSSProperties;
}

/**
 * Larger (16px), hover-reactive React Flow handle (I-07 batch 3). It fills with
 * its channel/branch colour once connected, and stays empty (white) otherwise.
 *
 * The translate classes reproduce React Flow's own positioning transform so the
 * `hover:scale-125` (which also writes `transform`) grows the dot in place
 * instead of knocking it off its anchor.
 */
export function StyledHandle({
  nodeId,
  handleType,
  position,
  id,
  borderClass,
  fillClass,
  style,
}: StyledHandleProps) {
  const connected = useHandleConnected(nodeId, handleType, id);
  // In read-only preview the handles are shown for context but must not start a
  // connection drag — only the editor can wire nodes together.
  const { readOnly } = useNodeActions();
  const posTranslate = position === Position.Top ? '-translate-y-1/2' : 'translate-y-1/2';
  return (
    <Handle
      type={handleType}
      position={position}
      id={id}
      isConnectable={!readOnly}
      style={style}
      className={cn(
        'h-4 w-4 -translate-x-1/2 rounded-full border-2 transition-transform duration-150 hover:scale-125',
        posTranslate,
        borderClass,
        connected ? fillClass : 'bg-white',
      )}
    />
  );
}

export interface NodeShellProps {
  type: NodeType;
  icon: LucideIcon;
  label: string;
  /** Secondary line under the label (channel preview, formatted delay…). */
  subtitle?: string | undefined;
  /** Canonical node id — enables the quick-delete trash affordance. */
  nodeId?: string | undefined;
  selected?: boolean | undefined;
  status?: NodeStatus | undefined;
  /** Target handle on top (every node except Start). */
  hasTarget?: boolean;
  /** Single source handle on the bottom (every node except End and Condition). */
  hasSource?: boolean;
  /** Notification indicators (action nodes only). */
  notify?: NotifyIndicator | undefined;
  /** Graph-coherence indicator (I-06 live validation). */
  validation?: NodeValidation | undefined;
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
  subtitle,
  nodeId,
  selected,
  status,
  hasTarget = true,
  hasSource = true,
  notify,
  validation,
  children,
}: NodeShellProps) {
  const styles = getChannelStyles(type);
  const { onRemoveNode, readOnly } = useNodeActions();
  // Trash lives on the top-left, the badge on the top-right — both can show.
  const showTrash = !readOnly && onRemoveNode !== undefined && nodeId !== undefined;
  return (
    <div
      className={cn(
        'group relative min-w-[200px] rounded-xl border-2 p-3 shadow-sm transition-shadow hover:shadow-md',
        styles.border,
        styles.bg,
        selected && cn('ring-2', styles.ring),
        // Preview-mode execution highlight: coloured ring + dim not-yet-reached.
        status && getExecRingStyles(NODE_STATUS_TO_EXEC[status]).ring,
        status === 'pending' && 'opacity-60',
      )}
    >
      {showTrash && <TrashButton nodeId={nodeId} />}

      {hasTarget && (
        <StyledHandle
          nodeId={nodeId}
          handleType="target"
          position={Position.Top}
          borderClass={styles.solidBorder}
          fillClass={styles.chip}
        />
      )}

      <div className="flex items-center gap-2.5">
        <span className={cn('relative rounded-lg p-2 text-white', styles.chip)}>
          <Icon size={16} />
          {notify && <NotifBadge {...notify} />}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className={cn('text-[13px] font-medium', styles.text)}>{label}</span>
          {subtitle && (
            <span
              data-testid="node-subtitle"
              className="line-clamp-1 text-xs text-muted-foreground"
            >
              {subtitle}
            </span>
          )}
        </span>
      </div>

      {status && (
        <span
          data-testid="status-dot"
          className={cn('absolute right-2 top-2 h-2 w-2 rounded-full', STATUS_DOT[status])}
        />
      )}

      {validation && <ValidationBadge {...validation} />}

      {hasSource && (
        <StyledHandle
          nodeId={nodeId}
          handleType="source"
          position={Position.Bottom}
          borderClass={styles.solidBorder}
          fillClass={styles.chip}
        />
      )}

      {children}
    </div>
  );
}

export const NodeShell = memo(NodeShellComponent);
