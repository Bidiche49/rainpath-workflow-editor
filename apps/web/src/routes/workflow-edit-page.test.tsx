import type { Workflow } from '@rainpath/schemas';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { WorkflowEditPage } from './workflow-edit-page';

const navigate = vi.fn();
const getWorkflow = vi.fn();
const updateWorkflow = vi.fn();
const toastSuccess = vi.fn();
const notifyApiError = vi.fn();

vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
  useParams: () => ({ id: 'wf_1' }),
}));
// jsdom drop events carry no clientX/clientY, so React Flow's
// screenToFlowPosition would yield an undefined (un-serializable) position.
// Stub it to a fixed finite point so a dropped node is valid and saveable.
vi.mock('@xyflow/react', async (orig) => {
  const actual = await orig<typeof import('@xyflow/react')>();
  return {
    ...actual,
    useReactFlow: () => ({ screenToFlowPosition: () => ({ x: 100, y: 100 }) }),
  };
});
vi.mock('@/lib/api/workflows', () => ({
  getWorkflow: (...a: unknown[]) => getWorkflow(...a),
  updateWorkflow: (...a: unknown[]) => updateWorkflow(...a),
}));
vi.mock('@/lib/api/error-toast', () => ({ notifyApiError: (e: unknown) => notifyApiError(e) }));
vi.mock('sonner', () => ({ toast: { success: (m: string) => toastSuccess(m) } }));

/** `extraNodes`/`extraEdges` let a test build an invalid graph (e.g. no End). */
function workflow(nodes: Workflow['graph']['nodes'], edges: Workflow['graph']['edges']): Workflow {
  return {
    id: 'wf_1',
    name: 'Relance J+7',
    schemaVersion: 1,
    graph: { nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } },
    settings: { notificationEmail: 'secretariat@labo.fr' },
    createdAt: new Date('2026-05-01'),
    updatedAt: new Date('2026-05-20'),
  };
}

const cleanGraph = workflow(
  [
    { id: 'start', type: 'start', position: { x: 0, y: 0 }, data: {} },
    { id: 'end', type: 'end', position: { x: 0, y: 120 }, data: {} },
  ],
  [{ id: 'e', source: 'start', target: 'end' }],
);

function renderPage() {
  return render(
    <MemoryRouter>
      <WorkflowEditPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  getWorkflow.mockResolvedValue(cleanGraph);
  updateWorkflow.mockResolvedValue(cleanGraph);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('WorkflowEditPage', () => {
  it('shows the not-found message on a 404', async () => {
    getWorkflow.mockRejectedValue(new ApiError(404, 'Not found'));
    renderPage();
    expect(await screen.findByText('Workflow introuvable')).toBeInTheDocument();
  });

  it('shows the error message and retries on a non-404 failure', async () => {
    getWorkflow.mockRejectedValueOnce(new Error('boom'));
    renderPage();

    const retry = await screen.findByRole('button', { name: 'Réessayer' });
    expect(notifyApiError).toHaveBeenCalledTimes(1);

    fireEvent.click(retry);
    expect(await screen.findByRole('button', { name: 'Enregistrer' })).toBeInTheDocument();
  });

  it('disables the Save button until the editor is dirty', async () => {
    renderPage();
    expect(await screen.findByRole('button', { name: 'Enregistrer' })).toBeDisabled();
  });

  it('saves directly (no force dialog) once dirty without critical errors', async () => {
    renderPage();
    await screen.findByRole('button', { name: 'Enregistrer' });

    // Dirty the editor by dropping a node — a disconnected node is only a
    // warning (orphan), never a blocking error, so no force-save dialog appears.
    fireEvent.drop(screen.getByTestId('canvas-dropzone'), {
      clientX: 120,
      clientY: 80,
      dataTransfer: { getData: () => 'email' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(updateWorkflow).toHaveBeenCalledTimes(1));
    expect(updateWorkflow.mock.calls[0]?.[1]).toMatchObject({
      settings: { notificationEmail: 'secretariat@labo.fr' },
    });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('requires explicit confirmation to save a graph with critical errors', async () => {
    // No End node → "no-end" critical error blocks a clean save.
    getWorkflow.mockResolvedValue(
      workflow([{ id: 'start', type: 'start', position: { x: 0, y: 0 }, data: {} }], []),
    );
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Enregistrer' }));

    // Persist is deferred until the user forces it.
    expect(updateWorkflow).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Forcer la sauvegarde' }));

    await waitFor(() => expect(updateWorkflow).toHaveBeenCalledTimes(1));
  });

  it('saves the secretariat email from the settings dialog', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Réglages du workflow' }));

    const input = await screen.findByLabelText('Email du secrétariat');
    fireEvent.change(input, { target: { value: 'nouvelle@labo.fr' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() =>
      expect(updateWorkflow).toHaveBeenCalledWith('wf_1', {
        settings: { notificationEmail: 'nouvelle@labo.fr' },
      }),
    );
    expect(toastSuccess).toHaveBeenCalledWith('Réglages enregistrés');
  });

  it('commits an inline rename', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Relance J+7' }));

    const input = screen.getByLabelText('Nom du workflow');
    fireEvent.change(input, { target: { value: 'Relance J+15' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() =>
      expect(updateWorkflow).toHaveBeenCalledWith('wf_1', { name: 'Relance J+15' }),
    );
    expect(toastSuccess).toHaveBeenCalledWith('Nom mis à jour');
  });
});
