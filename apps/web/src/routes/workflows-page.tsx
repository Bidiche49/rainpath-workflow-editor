import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function WorkflowsPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workflows</h1>
          <p className="mt-1 text-sm text-muted-foreground">Vos séquences de relance patient.</p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          Nouveau workflow
        </Button>
      </div>

      <p className="mt-8 text-sm text-muted-foreground">Liste des workflows — wired in I-02.</p>
    </div>
  );
}
