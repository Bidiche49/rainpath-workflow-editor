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

import type { NodeType } from '@rainpath/schemas';

/** A draggable palette entry — the single source for icon + label per type. */
export interface NodePaletteEntry {
  type: NodeType;
  label: string;
  description: string;
  icon: LucideIcon;
  group: 'flow' | 'channel' | 'logic';
}

/** The 8 node types, grouped for the sidebar palette (B-03). */
export const NODE_CATALOG: readonly NodePaletteEntry[] = [
  { type: 'start', label: 'Début', description: 'Point de départ', icon: Play, group: 'flow' },
  { type: 'end', label: 'Fin', description: 'Fin du parcours', icon: Check, group: 'flow' },
  { type: 'email', label: 'Email', description: 'Envoi e-mail', icon: Mail, group: 'channel' },
  { type: 'sms', label: 'SMS', description: 'Envoi SMS', icon: MessageSquare, group: 'channel' },
  {
    type: 'whatsapp',
    label: 'WhatsApp',
    description: 'Message WhatsApp',
    icon: MessageCircle,
    group: 'channel',
  },
  {
    type: 'letter',
    label: 'Courrier',
    description: 'Courrier postal',
    icon: Send,
    group: 'channel',
  },
  { type: 'wait', label: 'Attente', description: 'Délai d’attente', icon: Clock, group: 'logic' },
  {
    type: 'condition',
    label: 'Condition',
    description: 'Branche Oui / Non',
    icon: GitBranch,
    group: 'logic',
  },
];

export const NODE_GROUP_LABELS: Record<NodePaletteEntry['group'], string> = {
  flow: 'Flux',
  channel: 'Canaux',
  logic: 'Logique',
};

/** MIME-ish key used to carry the node type across an HTML5 drag-and-drop. */
export const DND_NODE_TYPE = 'application/rainpath-node-type';
