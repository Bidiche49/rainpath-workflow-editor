import type { ActionStatus, NodeType, Workflow } from '@rainpath/schemas';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Send,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { NODE_CATALOG } from '@/features/editor/lib/node-catalog';
import {
  countRelancesInLastDays,
  derivePatients,
  type PatientRow,
  type PatientUiStatus,
} from '@/features/dashboard/lib/derive-patients';
import { listAllActionLogs } from '@/lib/api/action-logs';
import { notifyApiError } from '@/lib/api/error-toast';
import { listWorkflows } from '@/lib/api/workflows';
import { getChannelStyles, getStatusBadgeStyles, type LogStatus } from '@/lib/design-tokens';
import { formatRelativeTime } from '@/lib/relative-time';
import { mapActionStatusToLogStatus } from '@/lib/status-mapper';
import { cn } from '@/lib/utils';

const NODE_META = new Map(NODE_CATALOG.map((entry) => [entry.type, entry]));

const PATIENT_STATUS_META: Record<PatientUiStatus, { label: string; className: string }> = {
  en_cours: { label: 'En cours', className: 'border-blue-200 bg-blue-50 text-blue-700' },
  bloque: { label: 'Bloqué', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  termine: { label: 'Terminé', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
};

const LOG_STATUS_LABEL: Record<LogStatus, string> = {
  sent: 'Envoyé',
  delivered: 'Délivré',
  opened: 'Ouvert',
  rejected: 'Échec',
  scheduled: 'Planifié',
};

type StatusFilter = 'all' | PatientUiStatus;

interface DashboardData {
  workflows: Workflow[];
  patients: PatientRow[];
  relancesThisWeek: number;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: DashboardData };

export function DashboardPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [workflowFilter, setWorkflowFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const [workflows, logs] = await Promise.all([listWorkflows(), listAllActionLogs()]);
      setState({
        status: 'ready',
        data: {
          workflows,
          patients: derivePatients(logs, workflows),
          relancesThisWeek: countRelancesInLastDays(logs),
        },
      });
    } catch (error) {
      notifyApiError(error);
      setState({ status: 'error' });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const data = state.status === 'ready' ? state.data : null;

  const filteredPatients = useMemo(() => {
    if (!data) return [];
    return data.patients.filter((patient) => {
      if (workflowFilter !== 'all' && patient.workflowId !== workflowFilter) return false;
      if (statusFilter !== 'all' && patient.status !== statusFilter) return false;
      return true;
    });
  }, [data, workflowFilter, statusFilter]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tableau de bord</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Suivi des patients en cours d'exécution dans les workflows actifs.
        </p>
      </div>

      {state.status === 'loading' && <DashboardSkeleton />}

      {state.status === 'error' && (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <p className="text-sm text-muted-foreground">Impossible de charger le tableau de bord.</p>
          <button
            type="button"
            onClick={() => void load()}
            className="text-sm font-medium text-primary hover:underline"
          >
            Réessayer
          </button>
        </div>
      )}

      {data && (
        <>
          <div className="mb-6 mt-6 grid grid-cols-4 gap-4">
            <StatCard
              icon={Users}
              iconClassName="bg-blue-100 text-blue-600"
              label="Patients en cours"
              value={data.patients.filter((p) => p.status === 'en_cours').length}
            />
            <StatCard
              icon={AlertCircle}
              iconClassName="bg-amber-100 text-amber-600"
              label="Bloqués"
              value={data.patients.filter((p) => p.status === 'bloque').length}
            />
            <StatCard
              icon={Send}
              iconClassName="bg-violet-100 text-violet-600"
              label="Relances cette semaine"
              value={data.relancesThisWeek}
            />
            <StatCard
              icon={CheckCircle2}
              iconClassName="bg-emerald-100 text-emerald-600"
              label="Terminés"
              value={data.patients.filter((p) => p.status === 'termine').length}
            />
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Select value={workflowFilter} onValueChange={setWorkflowFilter}>
              <SelectTrigger className="h-9 w-[240px]" aria-label="Filtrer par workflow">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les workflows</SelectItem>
                {data.workflows.map((workflow) => (
                  <SelectItem key={workflow.id} value={workflow.id}>
                    {workflow.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as StatusFilter)}
            >
              <SelectTrigger className="h-9 w-[180px]" aria-label="Filtrer par statut">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="en_cours">En cours</SelectItem>
                <SelectItem value="bloque">Bloqués</SelectItem>
                <SelectItem value="termine">Terminés</SelectItem>
              </SelectContent>
            </Select>

            <span className="ml-auto text-sm text-muted-foreground">
              {filteredPatients.length} patient{filteredPatients.length > 1 ? 's' : ''}
            </span>
          </div>

          {data.patients.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Workflow</TableHead>
                    <TableHead>Étape courante</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Dernière action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.map((patient) => (
                    <TableRow
                      key={patient.patientId}
                      className="cursor-pointer"
                      onClick={() =>
                        navigate(
                          `/workflows/${patient.workflowId}/preview?patientId=${encodeURIComponent(patient.patientId)}`,
                        )
                      }
                    >
                      <TableCell className="font-medium">{patient.name}</TableCell>
                      <TableCell>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground hover:underline"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/workflows/${patient.workflowId}/edit`);
                          }}
                        >
                          {patient.workflowName}
                        </button>
                      </TableCell>
                      <TableCell>
                        <ChannelBadge type={patient.currentNodeType} />
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={PATIENT_STATUS_META[patient.status].className}
                        >
                          {PATIENT_STATUS_META[patient.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-between gap-2">
                          <LastActionBadge
                            status={patient.lastActionStatus}
                            at={patient.lastActionAt}
                          />
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Presentational helpers ───────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  iconClassName,
  label,
  value,
}: {
  icon: LucideIcon;
  iconClassName: string;
  label: string;
  value: number;
}) {
  return (
    <Card className="p-5">
      <span
        className={cn('inline-flex h-9 w-9 items-center justify-center rounded-lg', iconClassName)}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="mt-3 text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
    </Card>
  );
}

function ChannelBadge({ type }: { type: NodeType }) {
  const meta = NODE_META.get(type);
  const styles = getChannelStyles(type);
  const Icon = meta?.icon ?? Send;
  return (
    <Badge variant="outline" className={cn('gap-1', styles.bg, styles.text, styles.border)}>
      <Icon className="h-3 w-3" />
      {meta?.label ?? type}
    </Badge>
  );
}

function LastActionBadge({ status, at }: { status: ActionStatus; at: Date }) {
  const logStatus = mapActionStatusToLogStatus(status);
  const styles = getStatusBadgeStyles(logStatus);
  return (
    <span className="flex items-center gap-2">
      <Badge variant="outline" className={cn(styles.bg, styles.text, styles.border)}>
        {LOG_STATUS_LABEL[logStatus]}
      </Badge>
      <span className="text-xs text-muted-foreground">{formatRelativeTime(at)}</span>
    </span>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mt-6">
      <div className="mb-6 grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="p-5">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="mt-3 h-4 w-24" />
            <Skeleton className="mt-2 h-7 w-12" />
          </Card>
        ))}
      </div>
      <div className="space-y-3 rounded-lg border p-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
      <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Users className="h-6 w-6" />
      </span>
      <h2 className="text-lg font-semibold">Aucun patient en suivi</h2>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
        Les patients apparaîtront ici dès que des relances seront enregistrées. Lancez
        <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">pnpm db:seed</code>
        pour peupler des données de démonstration.
      </p>
    </div>
  );
}
