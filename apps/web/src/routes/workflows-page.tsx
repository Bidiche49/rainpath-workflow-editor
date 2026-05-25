import type { CreateWorkflowInput, Workflow, WorkflowGraph } from '@rainpath/schemas';
import { Copy, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { createWorkflow, deleteWorkflow, listWorkflows } from '@/lib/api/workflows';
import { notifyApiError } from '@/lib/api/error-toast';
import { formatRelativeTime } from '@/lib/relative-time';

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; workflows: Workflow[] };

/** Minimal valid graph for a freshly created workflow: a single Start node. */
function buildMinimalGraph(): WorkflowGraph {
  return {
    nodes: [{ id: 'start-1', type: 'start', position: { x: 300, y: 100 }, data: {} }],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

export function WorkflowsPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Workflow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const workflows = await listWorkflows();
      setState({ status: 'ready', workflows });
    } catch (error) {
      notifyApiError(error);
      setState({ status: 'error' });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = useCallback(async () => {
    if (creating) return;
    setCreating(true);
    const payload: CreateWorkflowInput = {
      name: 'Nouveau workflow',
      graph: buildMinimalGraph(),
      settings: { notificationEmail: 'secretariat@labo.fr' },
    };
    try {
      const created = await createWorkflow(payload);
      navigate(`/workflows/${created.id}/edit`);
    } catch (error) {
      notifyApiError(error);
      setCreating(false);
    }
  }, [creating, navigate]);

  const handleDuplicate = useCallback(
    async (source: Workflow) => {
      const payload: CreateWorkflowInput = {
        name: `${source.name} (copie)`,
        description: source.description,
        graph: structuredClone(source.graph),
        settings: structuredClone(source.settings),
      };
      try {
        await createWorkflow(payload);
        toast.success('Workflow dupliqué');
        await load();
      } catch (error) {
        notifyApiError(error);
      }
    },
    [load],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const target = pendingDelete;
    try {
      await deleteWorkflow(target.id);
      setState((prev) =>
        prev.status === 'ready'
          ? { status: 'ready', workflows: prev.workflows.filter((w) => w.id !== target.id) }
          : prev,
      );
      toast.success('Workflow supprimé');
      setPendingDelete(null);
    } catch (error) {
      notifyApiError(error);
    } finally {
      setDeleting(false);
    }
  }, [pendingDelete]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workflows</h1>
          <p className="mt-1 text-sm text-muted-foreground">Vos séquences de relance patient.</p>
        </div>
        <Button onClick={() => void handleCreate()} disabled={creating}>
          <Plus className="h-4 w-4" />
          Nouveau workflow
        </Button>
      </div>

      <div className="mt-8">
        {state.status === 'loading' && <WorkflowsTableSkeleton />}

        {state.status === 'error' && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
            <p className="text-sm text-muted-foreground">Impossible de charger les workflows.</p>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Réessayer
            </Button>
          </div>
        )}

        {state.status === 'ready' &&
          (state.workflows.length === 0 ? (
            <EmptyState onCreate={() => void handleCreate()} creating={creating} />
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right"># Nodes</TableHead>
                    <TableHead>Mis à jour</TableHead>
                    <TableHead className="w-[48px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.workflows.map((wf) => (
                    <TableRow key={wf.id}>
                      <TableCell>
                        <Link
                          to={`/workflows/${wf.id}/edit`}
                          className="font-medium hover:underline"
                        >
                          {wf.name}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-[320px] truncate text-muted-foreground">
                        {wf.description ?? '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {wf.graph.nodes.length}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatRelativeTime(wf.updatedAt)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label={`Actions pour ${wf.name}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => navigate(`/workflows/${wf.id}/edit`)}>
                              <Pencil className="h-4 w-4" />
                              Ouvrir
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => void handleDuplicate(wf)}>
                              <Copy className="h-4 w-4" />
                              Dupliquer
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={() => setPendingDelete(wf)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer définitivement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le workflow «&nbsp;{pendingDelete?.name}&nbsp;» et sa configuration seront supprimés.
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleConfirmDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function WorkflowsTableSkeleton() {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center gap-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onCreate, creating }: { onCreate: () => void; creating: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
      <svg
        width="120"
        height="100"
        viewBox="0 0 120 100"
        className="mb-5 text-muted-foreground/40"
        aria-hidden="true"
      >
        <rect
          x="10"
          y="20"
          width="40"
          height="24"
          rx="4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <rect
          x="70"
          y="20"
          width="40"
          height="24"
          rx="4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <rect
          x="40"
          y="60"
          width="40"
          height="24"
          rx="4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M50 44 L50 60 M70 44 L70 60"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
        <circle cx="30" cy="32" r="3" fill="currentColor" opacity=".4" />
        <circle cx="90" cy="32" r="3" fill="currentColor" opacity=".4" />
        <circle cx="60" cy="72" r="3" fill="currentColor" opacity=".4" />
      </svg>
      <h2 className="text-lg font-semibold">Aucun workflow pour l'instant</h2>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
        Créez votre premier workflow pour automatiser les relances patients : email, SMS, WhatsApp
        et courrier postal.
      </p>
      <Button className="mt-5" onClick={onCreate} disabled={creating}>
        <Plus className="h-4 w-4" />
        Créer mon premier workflow
      </Button>
    </div>
  );
}
