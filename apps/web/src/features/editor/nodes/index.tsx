import { memo } from 'react';

import { Position, type NodeProps, type NodeTypes } from '@xyflow/react';
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

import { NodeShell, StyledHandle, type NodeValidation, type NotifyIndicator } from './node-shell';

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
      {/* Branch handles and labels both use the condition's violet (node
          identity); the Oui/Non wording carries the yes/no meaning. */}
      <StyledHandle
        nodeId={id}
        handleType="source"
        position={Position.Bottom}
        id="yes"
        borderClass="border-channel-condition-500"
        fillClass="bg-channel-condition-500"
        style={{ left: '30%' }}
      />
      <StyledHandle
        nodeId={id}
        handleType="source"
        position={Position.Bottom}
        id="no"
        borderClass="border-channel-condition-500"
        fillClass="bg-channel-condition-500"
        style={{ left: '70%' }}
      />
      <span className="pointer-events-none absolute -bottom-5 left-[30%] -translate-x-1/2 text-xs font-semibold text-channel-condition-700">
        Oui
      </span>
      <span className="pointer-events-none absolute -bottom-5 left-[70%] -translate-x-1/2 text-xs font-semibold text-channel-condition-700">
        Non
      </span>
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
