import type { ActionLog, ActionStatus, ChannelNodeType, Workflow } from '@rainpath/schemas';
import { Activity, ChevronLeft, Lock } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WorkflowCanvas } from '@/features/editor/components/WorkflowCanvas';
import type { AppEdge, AppNode } from '@/features/editor/hooks/useWorkflowEditor';
import { NODE_CATALOG } from '@/features/editor/lib/node-catalog';
import { patientDisplayName } from '@/features/dashboard/lib/derive-patients';
import { computeActiveEdges } from '@/features/patient-preview/lib/active-edges';
import { computeNextStep, computeNodeStatuses } from '@/features/patient-preview/lib/preview-exec';
import { ApiError } from '@/lib/api/client';
import { createActionLog, listActionLogs } from '@/lib/api/action-logs';
import { notifyApiError } from '@/lib/api/error-toast';
import { getWorkflow } from '@/lib/api/workflows';
import { getStatusBadgeStyles, type LogStatus } from '@/lib/design-tokens';
import { useBackNavigation } from '@/lib/hooks/useBackNavigation';
import { formatRelativeTime } from '@/lib/relative-time';
import { mapActionStatusToLogStatus } from '@/lib/status-mapper';
import { cn } from '@/lib/utils';

const NODE_META = new Map(NODE_CATALOG.map((entry) => [entry.type, entry]));

const LOG_STATUS_LABEL: Record<LogStatus, string> = {
  sent: 'Envoyé',
  delivered: 'Délivré',
  opened: 'Ouvert',
  rejected: 'Échec',
  scheduled: 'Planifié',
};

/** Weighted pool for the simulated next action (mostly successful sends). */
const STATUS_POOL: readonly ActionStatus[] = ['sent', 'sent', 'sent', 'failed', 'skipped'];

function randomStatus(): ActionStatus {
  return STATUS_POOL[Math.floor(Math.random() * STATUS_POOL.length)] ?? 'sent';
}

function simulatedMessage(channel: ChannelNodeType, status: ActionStatus): string {
  const label = NODE_META.get(channel)?.label ?? channel;
  switch (status) {
    case 'sent':
      return `${label} envoyé`;
    case 'failed':
      return `${label} en échec`;
    case 'skipped':
      return `${label} ignoré`;
    case 'pending':
      return `${label} planifié`;
  }
}

const noop = () => {};

type LoadStatus = 'loading' | 'ready' | 'notfound' | 'error';

export function WorkflowPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patientId');
  const navigate = useNavigate();
  const goBack = useBackNavigation('/');

  const [status, setStatus] = useState<LoadStatus>('loading');
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [simulating, setSimulating] = useState(false);

  const refetchLogs = useCallback(async () => {
    if (!patientId) return;
    setLogs(await listActionLogs(patientId));
  }, [patientId]);

  const load = useCallback(async () => {
    if (!id || !patientId) return;
    setStatus('loading');
    try {
      const [wf, patientLogs] = await Promise.all([getWorkflow(id), listActionLogs(patientId)]);
      setWorkflow(wf);
      setLogs(patientLogs);
      setStatus('ready');
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setStatus('notfound');
        return;
      }
      notifyApiError(error);
      setStatus('error');
    }
  }, [id, patientId]);

  useEffect(() => {
    void load();
  }, [load]);

  // API returns newest-first; ascending order drives the execution status.
  const logsAsc = useMemo(
    () => [...logs].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime()),
    [logs],
  );

  const startNodeId = useMemo(
    () => workflow?.graph.nodes.find((node) => node.type === 'start')?.id ?? null,
    [workflow],
  );

  const currentNodeId = useMemo(() => {
    const last = logsAsc[logsAsc.length - 1];
    return last ? last.nodeId : startNodeId;
  }, [logsAsc, startNodeId]);

  // Edges the patient actually traversed (future paths + dead branches excluded).
  const activeEdgeIds = useMemo(
    () => (workflow ? computeActiveEdges(workflow.graph, logsAsc) : new Set<string>()),
    [workflow, logsAsc],
  );

  // Nodes on the traversed route: every endpoint of an active edge, plus the
  // current position (covers a fresh patient still sitting on Start).
  const activeNodeIds = useMemo(() => {
    const ids = new Set<string>();
    if (!workflow) return ids;
    for (const edge of workflow.graph.edges) {
      if (activeEdgeIds.has(edge.id)) {
        ids.add(edge.source);
        ids.add(edge.target);
      }
    }
    if (currentNodeId) ids.add(currentNodeId);
    return ids;
  }, [workflow, activeEdgeIds, currentNodeId]);

  // Lightly dim the nodes off the traversed route (not yet reached, or on a
  // condition branch that wasn't taken) so the real path stands out while they
  // all stay clearly visible (I-08 FIX 4).
  const previewNodes = useMemo<AppNode[]>(() => {
    if (!workflow) return [];
    const statuses = computeNodeStatuses(logsAsc);
    return workflow.graph.nodes.map((node) => {
      const next = { ...node, data: { ...node.data, status: statuses.get(node.id) } };
      return activeNodeIds.has(node.id) ? next : { ...next, style: { opacity: 0.5 } };
    }) as AppNode[];
  }, [workflow, logsAsc, activeNodeIds]);

  // Dim every edge the patient did not traverse, more strongly than the nodes.
  const previewEdges = useMemo<AppEdge[]>(() => {
    if (!workflow) return [];
    return workflow.graph.edges.map((edge) =>
      activeEdgeIds.has(edge.id) ? edge : { ...edge, style: { opacity: 0.25 } },
    );
  }, [workflow, activeEdgeIds]);

  const nextStep = useMemo(
    () => (workflow ? computeNextStep(workflow.graph, currentNodeId) : { kind: 'none' as const }),
    [workflow, currentNodeId],
  );

  const handleSimulate = useCallback(async () => {
    if (!workflow || !patientId) return;
    const step = computeNextStep(workflow.graph, currentNodeId);
    if (step.kind !== 'channel') return;

    const actionStatus = randomStatus();
    setSimulating(true);
    try {
      await createActionLog({
        patientId,
        workflowId: workflow.id,
        nodeId: step.node.id,
        channel: step.channel,
        status: actionStatus,
        message: simulatedMessage(step.channel, actionStatus),
        occurredAt: new Date(),
      });
      toast.success('Étape simulée');
      await refetchLogs();
    } catch (error) {
      notifyApiError(error);
    } finally {
      setSimulating(false);
    }
  }, [workflow, patientId, currentNodeId, refetchLogs]);

  if (!patientId) {
    return (
      <CenteredMessage
        title="Aucun patient sélectionné"
        description="Ouvrez un patient depuis le tableau de bord pour visualiser son parcours."
        onBack={() => navigate('/')}
      />
    );
  }

  if (status === 'loading') return <PreviewSkeleton />;

  if (status === 'notfound') {
    return (
      <CenteredMessage
        title="Workflow introuvable"
        description="Ce workflow n'existe pas ou a été supprimé."
        onBack={() => navigate('/workflows')}
      />
    );
  }

  if (status === 'error' || !workflow) {
    return (
      <CenteredMessage
        title="Impossible de charger l'aperçu"
        description="Une erreur est survenue lors du chargement."
        onBack={() => navigate('/workflows')}
        onRetry={() => void load()}
      />
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <header className="flex h-14 flex-shrink-0 items-center gap-3 border-b px-3">
        <Button variant="ghost" size="icon" aria-label="Retour" onClick={goBack}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold">{workflow.name}</span>
        <div className="ml-auto flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            Lecture seule
          </span>
          <Badge variant="secondary">{patientDisplayName(patientId)}</Badge>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          <WorkflowCanvas
            nodes={previewNodes}
            edges={previewEdges}
            onNodesChange={noop}
            onEdgesChange={noop}
            onConnect={noop}
            onAddNode={noop}
            readOnly
          />
        </div>

        <Timeline
          logs={logs}
          nextStep={nextStep}
          simulating={simulating}
          onSimulate={() => void handleSimulate()}
        />
      </div>
    </div>
  );
}

// ── Timeline panel ───────────────────────────────────────────────────────────

function Timeline({
  logs,
  nextStep,
  simulating,
  onSimulate,
}: {
  logs: ActionLog[];
  nextStep: ReturnType<typeof computeNextStep>;
  simulating: boolean;
  onSimulate: () => void;
}) {
  const canSimulate = nextStep.kind === 'channel';
  const disabledReason =
    nextStep.kind === 'end' ? 'Le workflow est terminé' : 'Étape suivante non définie';

  return (
    <aside className="flex w-[400px] flex-shrink-0 flex-col border-l bg-card">
      <div className="flex h-14 flex-shrink-0 items-center justify-between border-b px-5">
        <div>
          <div className="text-sm font-semibold">Historique</div>
          <div className="text-xs text-muted-foreground">
            {logs.length} action{logs.length > 1 ? 's' : ''} enregistrée{logs.length > 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {logs.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucune action enregistrée pour ce patient.
          </p>
        ) : (
          <ol className="space-y-4">
            {logs.map((log) => (
              <TimelineItem key={log.id} log={log} />
            ))}
          </ol>
        )}
      </div>

      <div className="flex-shrink-0 border-t bg-muted/30 p-4">
        {canSimulate ? (
          <Button className="w-full" onClick={onSimulate} disabled={simulating}>
            <Activity className="h-4 w-4" />
            Simuler l'étape suivante
          </Button>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                {/* span wrapper: a disabled button does not emit pointer events. */}
                <span className="block">
                  <Button className="w-full" disabled>
                    <Activity className="h-4 w-4" />
                    Simuler l'étape suivante
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>{disabledReason}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </aside>
  );
}

function TimelineItem({ log }: { log: ActionLog }) {
  const meta = NODE_META.get(log.channel);
  const Icon = meta?.icon;
  const logStatus = mapActionStatusToLogStatus(log.status);
  const badge = getStatusBadgeStyles(logStatus);

  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-semibold">{meta?.label ?? log.channel}</span>
          <Badge variant="outline" className={cn('shrink-0', badge.bg, badge.text, badge.border)}>
            {LOG_STATUS_LABEL[logStatus]}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">{formatRelativeTime(log.occurredAt)}</div>
        {log.message && (
          <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-muted-foreground">
            {log.message}
          </p>
        )}
      </div>
    </li>
  );
}

// ── Loading / error states ───────────────────────────────────────────────────

function PreviewSkeleton() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <header className="flex h-14 flex-shrink-0 items-center gap-3 border-b px-3">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="ml-auto h-6 w-28" />
      </header>
      <div className="flex min-h-0 flex-1">
        <Skeleton className="m-4 flex-1 rounded-lg" />
        <div className="w-[400px] flex-shrink-0 space-y-4 border-l p-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex gap-3">
              <Skeleton className="h-7 w-7 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CenteredMessage({
  title,
  description,
  onBack,
  onRetry,
}: {
  title: string;
  description: string;
  onBack: () => void;
  onRetry?: () => void;
}) {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-4 text-center">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
          Retour
        </Button>
        {onRetry && <Button onClick={onRetry}>Réessayer</Button>}
      </div>
    </div>
  );
}
