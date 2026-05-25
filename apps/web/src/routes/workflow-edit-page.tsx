import { ChevronLeft, Settings } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { NodeSidePanel } from '@/features/editor/components/NodeSidePanel';
import { WorkflowCanvas } from '@/features/editor/components/WorkflowCanvas';
import { useWorkflowEditor } from '@/features/editor/hooks/useWorkflowEditor';
import { ApiError } from '@/lib/api/client';
import { notifyApiError } from '@/lib/api/error-toast';
import { getWorkflow, updateWorkflow } from '@/lib/api/workflows';
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';

type LoadStatus = 'loading' | 'ready' | 'notfound' | 'error';

const emailSchema = z.string().email();

export function WorkflowEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const editor = useWorkflowEditor();

  const [status, setStatus] = useState<LoadStatus>('loading');
  const [workflowName, setWorkflowName] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setStatus('loading');
    try {
      const workflow = await getWorkflow(id);
      editor.init(workflow);
      setWorkflowName(workflow.name);
      setStatus('ready');
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setStatus('notfound');
        return;
      }
      notifyApiError(error);
      setStatus('error');
    }
    // Deps intentionally limited to `id`: `editor` is a fresh object each render
    // (its methods are stable via useCallback), so including it would refetch on
    // every render. Reloading is keyed on the route param only.
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = useCallback(async () => {
    if (!id || status !== 'ready') return;
    try {
      const graph = editor.serialize();
      await updateWorkflow(id, { graph, settings: editor.settings });
      toast.success('Workflow enregistré');
    } catch (error) {
      notifyApiError(error);
    }
  }, [id, status, editor]);

  const deleteSelected = useCallback(() => {
    if (!selectedNodeId) return;
    editor.removeNode(selectedNodeId);
    setSelectedNodeId(null);
  }, [selectedNodeId, editor]);

  const deselect = useCallback(() => setSelectedNodeId(null), []);

  useKeyboardShortcuts({
    'mod+s': () => void handleSave(),
    Delete: deleteSelected,
    Escape: deselect,
  });

  const handleRenameCommit = useCallback(
    async (nextName: string) => {
      const trimmed = nextName.trim();
      if (!id || trimmed === '' || trimmed === workflowName) return;
      const previous = workflowName;
      setWorkflowName(trimmed);
      try {
        await updateWorkflow(id, { name: trimmed });
        toast.success('Nom mis à jour');
      } catch (error) {
        setWorkflowName(previous);
        notifyApiError(error);
      }
    },
    [id, workflowName],
  );

  const handleSettingsSave = useCallback(
    async (email: string) => {
      if (!id) return;
      editor.updateSettings({ notificationEmail: email });
      setSettingsOpen(false);
      try {
        await updateWorkflow(id, { settings: { notificationEmail: email } });
        toast.success('Réglages enregistrés');
      } catch (error) {
        notifyApiError(error);
      }
    },
    [id, editor],
  );

  if (status === 'loading') return <EditorSkeleton />;

  if (status === 'notfound') {
    return (
      <CenteredMessage
        title="Workflow introuvable"
        description="Ce workflow n'existe pas ou a été supprimé."
        onBack={() => navigate('/workflows')}
      />
    );
  }

  if (status === 'error') {
    return (
      <CenteredMessage
        title="Impossible de charger le workflow"
        description="Une erreur est survenue lors du chargement."
        onBack={() => navigate('/workflows')}
        onRetry={() => void load()}
      />
    );
  }

  const selectedNode = editor.nodes.find((n) => n.id === selectedNodeId) ?? null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <header className="flex h-14 flex-shrink-0 items-center gap-2 border-b px-3">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Retour à la liste"
          onClick={() => navigate('/workflows')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <InlineNameEditor name={workflowName} onCommit={handleRenameCommit} />

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            aria-label="Réglages du workflow"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-4 w-4" />
            Réglages
          </Button>
          <Button size="sm" onClick={() => void handleSave()}>
            Enregistrer
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <WorkflowCanvas
          nodes={editor.nodes}
          edges={editor.edges}
          onNodesChange={editor.onNodesChange}
          onEdgesChange={editor.onEdgesChange}
          onConnect={editor.connectEdge}
          onAddNode={editor.addNode}
          onNodeClick={setSelectedNodeId}
          onPaneClick={deselect}
          onViewportChange={editor.setViewport}
        />
      </div>

      <NodeSidePanel
        open={selectedNode !== null}
        node={selectedNode}
        notificationEmail={editor.settings.notificationEmail}
        onOpenChange={(open) => {
          if (!open) setSelectedNodeId(null);
        }}
        onUpdateNodeData={editor.updateNodeData}
      />

      <WorkflowSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        initialEmail={editor.settings.notificationEmail}
        onSave={handleSettingsSave}
      />
    </div>
  );
}

// ── Inline workflow-name editor ──────────────────────────────────────────────

function InlineNameEditor({ name, onCommit }: { name: string; onCommit: (next: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = () => {
    setValue(name);
    setEditing(true);
  };

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    onCommit(value);
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={startEditing}
        className="-ml-1 rounded px-2 py-1 text-sm font-semibold hover:bg-accent"
      >
        {name || 'Sans titre'}
      </button>
    );
  }

  return (
    <Input
      ref={inputRef}
      value={value}
      aria-label="Nom du workflow"
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setValue(name);
          setEditing(false);
        }
      }}
      className="h-8 w-[260px] text-sm font-semibold"
    />
  );
}

// ── Settings dialog ──────────────────────────────────────────────────────────

interface WorkflowSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialEmail: string;
  onSave: (email: string) => void;
}

function WorkflowSettingsDialog({
  open,
  onOpenChange,
  initialEmail,
  onSave,
}: WorkflowSettingsDialogProps) {
  const [email, setEmail] = useState(initialEmail);

  // Re-sync the field whenever the dialog (re)opens.
  useEffect(() => {
    if (open) setEmail(initialEmail);
  }, [open, initialEmail]);

  const isValid = emailSchema.safeParse(email.trim()).success;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Réglages du workflow</DialogTitle>
          <DialogDescription>
            Adresse du secrétariat notifiée à chaque action (sauf surcharge par étape).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="notification-email">Email du secrétariat</Label>
          <Input
            id="notification-email"
            type="email"
            value={email}
            placeholder="secretariat@labo.fr"
            aria-invalid={!isValid}
            onChange={(e) => setEmail(e.target.value)}
          />
          {!isValid && email.trim() !== '' && (
            <p className="text-[12px] text-destructive">Adresse e-mail invalide.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button disabled={!isValid} onClick={() => onSave(email.trim())}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Loading / error states ───────────────────────────────────────────────────

function EditorSkeleton() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <header className="flex h-14 flex-shrink-0 items-center gap-3 border-b px-3">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-5 w-48" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-28" />
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[224px] flex-shrink-0 space-y-2 border-r p-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="m-4 flex-1 rounded-lg" />
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
          Retour à la liste
        </Button>
        {onRetry && <Button onClick={onRetry}>Réessayer</Button>}
      </div>
    </div>
  );
}
