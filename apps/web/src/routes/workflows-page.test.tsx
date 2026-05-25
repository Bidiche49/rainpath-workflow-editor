import type { Workflow } from '@rainpath/schemas';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkflowsPage } from './workflows-page';

const navigate = vi.fn();
const listWorkflows = vi.fn();
const createWorkflow = vi.fn();
const deleteWorkflow = vi.fn();
const toastSuccess = vi.fn();
const notifyApiError = vi.fn();

vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));
vi.mock('@/lib/api/workflows', () => ({
  listWorkflows: () => listWorkflows(),
  createWorkflow: (...a: unknown[]) => createWorkflow(...a),
  deleteWorkflow: (...a: unknown[]) => deleteWorkflow(...a),
}));
vi.mock('@/lib/api/error-toast', () => ({ notifyApiError: (e: unknown) => notifyApiError(e) }));
vi.mock('sonner', () => ({ toast: { success: (m: string) => toastSuccess(m) } }));

function workflow(overrides: Partial<Workflow> = {}): Workflow {
  return {
    id: 'wf_1',
    name: 'Relance J+7',
    description: 'Scénario type',
    schemaVersion: 1,
    graph: {
      nodes: [
        { id: 'start', type: 'start', position: { x: 0, y: 0 }, data: {} },
        { id: 'end', type: 'end', position: { x: 0, y: 0 }, data: {} },
      ],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
    settings: { notificationEmail: 'secretariat@labo.fr' },
    createdAt: new Date('2026-05-01'),
    updatedAt: new Date('2026-05-20'),
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <WorkflowsPage />
    </MemoryRouter>,
  );
}

/** Opens a Radix dropdown via keyboard (reliable in jsdom, unlike pointer). */
function openMenu(triggerName: string) {
  fireEvent.keyDown(screen.getByRole('button', { name: triggerName }), { key: 'Enter' });
}

beforeEach(() => {
  listWorkflows.mockResolvedValue([]);
  createWorkflow.mockResolvedValue(workflow({ id: 'wf_new' }));
  deleteWorkflow.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('WorkflowsPage', () => {
  it('shows the empty state and creates + navigates on first workflow', async () => {
    renderPage();
    const cta = await screen.findByRole('button', { name: /Créer mon premier workflow/i });

    fireEvent.click(cta);

    await waitFor(() => expect(createWorkflow).toHaveBeenCalledTimes(1));
    expect(navigate).toHaveBeenCalledWith('/workflows/wf_new/edit');
  });

  it('renders one row per workflow with its node count', async () => {
    listWorkflows.mockResolvedValue([
      workflow({ id: 'wf_1', name: 'Alpha' }),
      workflow({ id: 'wf_2', name: 'Beta', description: undefined }),
    ]);
    renderPage();

    expect(await screen.findByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    // Both seeded workflows carry 2 nodes (start + end).
    expect(screen.getAllByText('2')).toHaveLength(2);
  });

  it('surfaces the error state and retries the load', async () => {
    listWorkflows.mockRejectedValueOnce(new Error('boom'));
    renderPage();

    const retry = await screen.findByRole('button', { name: 'Réessayer' });
    expect(notifyApiError).toHaveBeenCalledTimes(1);

    listWorkflows.mockResolvedValue([workflow({ name: 'Recovered' })]);
    fireEvent.click(retry);

    expect(await screen.findByText('Recovered')).toBeInTheDocument();
  });

  it('deletes a workflow after confirmation and removes its row', async () => {
    listWorkflows.mockResolvedValue([workflow({ id: 'wf_1', name: 'Alpha' })]);
    renderPage();
    await screen.findByText('Alpha');

    openMenu('Actions pour Alpha');
    fireEvent.click(await screen.findByRole('menuitem', { name: /Supprimer/i }));

    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Supprimer' }));

    await waitFor(() => expect(deleteWorkflow).toHaveBeenCalledWith('wf_1'));
    expect(toastSuccess).toHaveBeenCalledWith('Workflow supprimé');
    await waitFor(() => expect(screen.queryByText('Alpha')).not.toBeInTheDocument());
  });

  it('duplicates a workflow and reloads the list', async () => {
    listWorkflows.mockResolvedValue([workflow({ id: 'wf_1', name: 'Alpha' })]);
    renderPage();
    await screen.findByText('Alpha');

    openMenu('Actions pour Alpha');
    fireEvent.click(await screen.findByRole('menuitem', { name: /Dupliquer/i }));

    await waitFor(() => expect(createWorkflow).toHaveBeenCalledTimes(1));
    expect(createWorkflow.mock.calls[0]?.[0]).toMatchObject({ name: 'Alpha (copie)' });
    expect(toastSuccess).toHaveBeenCalledWith('Workflow dupliqué');
  });
});
