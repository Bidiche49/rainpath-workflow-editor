import { memo } from 'react';

import { Handle, Position, type NodeProps, type NodeTypes } from '@xyflow/react';
import {
  Check,
  Clock,
  GitBranch,
  Mail,
  MessageCircle,
  MessageSquare,
  Play,
  Send,
  type LucideIcon,
} from 'lucide-react';

import type { ChannelNodeData, NodeStatus } from '@rainpath/schemas';

import { NodeShell, type NodeValidation, type NotifyIndicator } from './node-shell';

/** Common `data` fields every node carries (label + preview status + validation). */
interface BaseData {
  label?: string;
  status?: NodeStatus;
  validation?: NodeValidation;
}

// ── Start / End ────────────────────────────────────────────────────────────

function StartNodeComponent({ id, data, selected }: NodeProps) {
  const d = data as BaseData;
  return (
    <NodeShell
      type="start"
      icon={Play}
      label={d.label ?? 'Début'}
      nodeId={id}
      selected={selected}
      status={d.status}
      validation={d.validation}
      hasTarget={false}
    />
  );
}

function EndNodeComponent({ id, data, selected }: NodeProps) {
  const d = data as BaseData;
  return (
    <NodeShell
      type="end"
      icon={Check}
      label={d.label ?? 'Fin'}
      nodeId={id}
      selected={selected}
      status={d.status}
      validation={d.validation}
      hasSource={false}
    />
  );
}

// ── Channel nodes (Email / SMS / WhatsApp / Letter) ─────────────────────────

const CHANNEL_LABELS = {
  email: 'Email',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  letter: 'Courrier',
} as const;

type ChannelType = keyof typeof CHANNEL_LABELS;

/** Shared body for the four action channels — they differ only by type + icon. */
function ChannelNode({
  type,
  icon,
  props: { id, data, selected },
}: {
  type: ChannelType;
  icon: LucideIcon;
  props: NodeProps;
}) {
  const d = data as ChannelNodeData;
  const { status, validation } = data as BaseData;
  const notify: NotifyIndicator = {
    enabled: d.notifySecretariat ?? true,
    override: d.notificationEmailOverride,
  };
  return (
    <NodeShell
      type={type}
      icon={icon}
      label={d.label ?? CHANNEL_LABELS[type]}
      nodeId={id}
      selected={selected}
      status={status}
      validation={validation}
      notify={notify}
    />
  );
}

function EmailNodeComponent(props: NodeProps) {
  return <ChannelNode type="email" icon={Mail} props={props} />;
}
function SmsNodeComponent(props: NodeProps) {
  return <ChannelNode type="sms" icon={MessageSquare} props={props} />;
}
function WhatsAppNodeComponent(props: NodeProps) {
  return <ChannelNode type="whatsapp" icon={MessageCircle} props={props} />;
}
function LetterNodeComponent(props: NodeProps) {
  return <ChannelNode type="letter" icon={Send} props={props} />;
}

// ── Wait ─────────────────────────────────────────────────────────────────────

interface WaitData extends BaseData {
  delay?: { value: number; unit: string };
}

function WaitNodeComponent({ id, data, selected }: NodeProps) {
  const d = data as WaitData;
  const summary = d.delay ? `${d.delay.value} ${d.delay.unit}` : undefined;
  return (
    <NodeShell
      type="wait"
      icon={Clock}
      label={d.label ?? (summary ? `Attendre ${summary}` : 'Attente')}
      nodeId={id}
      selected={selected}
      status={d.status}
      validation={d.validation}
    />
  );
}

// ── Condition (two source branches: yes / no) ───────────────────────────────

function ConditionNodeComponent({ id, data, selected }: NodeProps) {
  const d = data as BaseData & { condition?: string };
  return (
    <NodeShell
      type="condition"
      icon={GitBranch}
      label={d.label ?? d.condition ?? 'Condition'}
      nodeId={id}
      selected={selected}
      status={d.status}
      validation={d.validation}
      hasSource={false}
    >
      <Handle id="yes" type="source" position={Position.Bottom} style={{ left: '30%' }} />
      <Handle id="no" type="source" position={Position.Bottom} style={{ left: '70%' }} />
      <div className="pointer-events-none mt-2 flex justify-between px-1 text-xs text-muted-foreground">
        <span>Oui</span>
        <span>Non</span>
      </div>
    </NodeShell>
  );
}

export const StartNode = memo(StartNodeComponent);
export const EndNode = memo(EndNodeComponent);
export const EmailNode = memo(EmailNodeComponent);
export const SmsNode = memo(SmsNodeComponent);
export const WhatsAppNode = memo(WhatsAppNodeComponent);
export const LetterNode = memo(LetterNodeComponent);
export const WaitNode = memo(WaitNodeComponent);
export const ConditionNode = memo(ConditionNodeComponent);

/** React Flow node-type mapping consumed by `<ReactFlow nodeTypes={…} />`. */
export const nodeTypes = {
  start: StartNode,
  end: EndNode,
  email: EmailNode,
  sms: SmsNode,
  whatsapp: WhatsAppNode,
  letter: LetterNode,
  wait: WaitNode,
  condition: ConditionNode,
} satisfies NodeTypes;
