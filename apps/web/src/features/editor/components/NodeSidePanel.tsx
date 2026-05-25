import { useState } from 'react';

import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { z } from 'zod';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

import { CHANNEL_NODE_TYPES, type WaitUnit } from '@rainpath/schemas';

import type { AppNode, AppNodeData } from '../hooks/useWorkflowEditor';

const emailSchema = z.string().email().optional();

// ── Condition encoding ───────────────────────────────────────────────────────
// The canonical schema stores a single `condition: string`. We encode the UI's
// (kind, detail) pair into that string with a separator so the frozen schema
// stays untouched (see CLAUDE.md — schemas figés Phase 0).

export type ConditionKind = 'data-available' | 'previous-result';
const CONDITION_SEP = '::';

export function parseCondition(raw: string): { kind: ConditionKind; detail: string } {
  const idx = raw.indexOf(CONDITION_SEP);
  if (idx === -1) return { kind: 'data-available', detail: raw };
  const kind = raw.slice(0, idx);
  return {
    kind: kind === 'previous-result' ? 'previous-result' : 'data-available',
    detail: raw.slice(idx + CONDITION_SEP.length),
  };
}

export function formatCondition(kind: ConditionKind, detail: string): string {
  return `${kind}${CONDITION_SEP}${detail}`;
}

const WAIT_UNIT_LABELS: { value: WaitUnit; label: string }[] = [
  { value: 'days', label: 'Jours' },
  { value: 'hours', label: 'Heures' },
];

function isChannelNode(type: string | undefined): boolean {
  return (CHANNEL_NODE_TYPES as readonly string[]).includes(type ?? '');
}

export interface NodeSidePanelProps {
  open: boolean;
  node: AppNode | null;
  /** Workflow-level secretariat inbox (Workflow.settings.notificationEmail). */
  notificationEmail: string;
  onOpenChange: (open: boolean) => void;
  onUpdateNodeData: (id: string, patch: Partial<AppNodeData>) => void;
}

/** Inner body — keyed on node id so local UI state resets per selection. */
function PanelBody({
  node,
  notificationEmail,
  onUpdateNodeData,
}: {
  node: AppNode;
  notificationEmail: string;
  onUpdateNodeData: (id: string, patch: Partial<AppNodeData>) => void;
}) {
  const data = node.data as {
    content?: string;
    delay?: { value: number; unit: WaitUnit };
    condition?: string;
    notifySecretariat?: boolean;
    notificationEmailOverride?: string;
  };

  const notifyOn = data.notifySecretariat ?? true;
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideValue, setOverrideValue] = useState(data.notificationEmailOverride ?? '');
  const [overrideError, setOverrideError] = useState<string | null>(null);

  const update = (patch: Partial<AppNodeData>) => onUpdateNodeData(node.id, patch);

  const handleOverrideChange = (raw: string) => {
    setOverrideValue(raw);
    const trimmed = raw.trim();
    if (trimmed === '') {
      setOverrideError(null);
      update({ notificationEmailOverride: undefined });
      return;
    }
    const parsed = emailSchema.safeParse(trimmed);
    if (parsed.success) {
      setOverrideError(null);
      update({ notificationEmailOverride: trimmed });
    } else {
      setOverrideError('Adresse e-mail invalide.');
    }
  };

  const condition = parseCondition(data.condition ?? '');

  return (
    <div className="space-y-6 py-2">
      {/* ── Channel message ─────────────────────────────────────────────── */}
      {isChannelNode(node.type) && (
        <div className="space-y-1.5">
          <Label htmlFor="node-content">Message</Label>
          <Textarea
            id="node-content"
            rows={6}
            value={data.content ?? ''}
            placeholder="Contenu du message envoyé au patient…"
            onChange={(e) => update({ content: e.target.value })}
          />
        </div>
      )}

      {/* ── Wait delay ───────────────────────────────────────────────────── */}
      {node.type === 'wait' && (
        <div className="space-y-1.5">
          <Label htmlFor="node-delay">Délai d’attente</Label>
          <div className="flex gap-2">
            <Input
              id="node-delay"
              type="number"
              min={1}
              className="w-24"
              value={data.delay?.value ?? 1}
              onChange={(e) =>
                update({
                  delay: {
                    value: Math.max(1, Number(e.target.value) || 1),
                    unit: data.delay?.unit ?? 'days',
                  },
                })
              }
            />
            <Select
              value={data.delay?.unit ?? 'days'}
              onValueChange={(unit) =>
                update({ delay: { value: data.delay?.value ?? 1, unit: unit as WaitUnit } })
              }
            >
              <SelectTrigger className="w-32" aria-label="Unité de délai">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WAIT_UNIT_LABELS.map((u) => (
                  <SelectItem key={u.value} value={u.value}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* ── Condition ────────────────────────────────────────────────────── */}
      {node.type === 'condition' && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Type de condition</Label>
            <Select
              value={condition.kind}
              onValueChange={(kind) =>
                update({ condition: formatCondition(kind as ConditionKind, condition.detail) })
              }
            >
              <SelectTrigger aria-label="Type de condition">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="data-available">Donnée disponible</SelectItem>
                <SelectItem value="previous-result">Résultat précédent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="node-subcondition">Sous-condition</Label>
            <Input
              id="node-subcondition"
              value={condition.detail}
              placeholder="ex. email ouvert, RDV confirmé…"
              onChange={(e) =>
                update({ condition: formatCondition(condition.kind, e.target.value) })
              }
            />
          </div>
        </div>
      )}

      {/* ── Internal notification (action nodes only) ────────────────────── */}
      {isChannelNode(node.type) && (
        <div className="space-y-3 border-t border-border pt-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13px] font-semibold text-foreground">Notification interne</div>
              <div className="text-[11.5px] text-muted-foreground">
                Prévenir le secrétariat à chaque déclenchement.
              </div>
            </div>
            <Switch
              aria-label="Notifier le secrétariat"
              checked={notifyOn}
              onCheckedChange={(checked) => {
                if (checked) {
                  update({ notifySecretariat: true });
                } else {
                  // Zod rule: no override allowed when notifications are off.
                  setOverrideValue('');
                  setOverrideError(null);
                  setOverrideOpen(false);
                  update({ notifySecretariat: false, notificationEmailOverride: undefined });
                }
              }}
            />
          </div>

          {notifyOn && (
            <>
              <div className="space-y-1.5">
                <Label>Destinataire par défaut</Label>
                <Input
                  readOnly
                  value={notificationEmail}
                  className="bg-muted text-muted-foreground"
                  aria-label="Email du secrétariat (workflow)"
                />
              </div>

              <Collapsible open={overrideOpen} onOpenChange={setOverrideOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="-ml-2 gap-1.5">
                    {overrideOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    Personnaliser pour cette étape
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-2">
                  <Alert
                    variant="destructive"
                    className="border-amber-300 bg-amber-50 text-amber-800 [&>svg]:text-amber-600"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Déconseillé pour le suivi global. À utiliser uniquement pour les cas
                      exceptionnels.
                    </AlertDescription>
                  </Alert>
                  <Input
                    type="email"
                    value={overrideValue}
                    placeholder="adresse@labo.fr"
                    aria-label="Adresse e-mail personnalisée"
                    aria-invalid={overrideError !== null}
                    onChange={(e) => handleOverrideChange(e.target.value)}
                  />
                  {overrideError && (
                    <p className="text-[11.5px] text-destructive">{overrideError}</p>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Right-hand editor panel (B-04). Controlled Sheet: `open` + `node` come from
 * the page's selection state; every edit is relayed through `updateNodeData`
 * (ADR-003 controlled mode + ADR-004 notification UX).
 */
export function NodeSidePanel({
  open,
  node,
  notificationEmail,
  onOpenChange,
  onUpdateNodeData,
}: NodeSidePanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] overflow-y-auto sm:max-w-[400px]">
        <SheetHeader>
          <SheetTitle>{node ? (node.data.label ?? 'Étape') : 'Étape'}</SheetTitle>
          <SheetDescription>Paramètres de l’étape sélectionnée.</SheetDescription>
        </SheetHeader>
        {node && (
          <PanelBody
            key={node.id}
            node={node}
            notificationEmail={notificationEmail}
            onUpdateNodeData={onUpdateNodeData}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
