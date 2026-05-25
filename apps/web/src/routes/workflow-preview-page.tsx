import { useParams } from 'react-router-dom';

export function WorkflowPreviewPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Aperçu patient</h1>
      <p className="mt-1 text-sm text-muted-foreground">Workflow {id}</p>
      <p className="mt-8 text-sm text-muted-foreground">
        Canvas read-only + timeline + simulation — wired in I-05.
      </p>
    </div>
  );
}
