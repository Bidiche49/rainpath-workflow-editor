import type { ActionLog, Workflow } from '@rainpath/schemas';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardPage } from './dashboard-page';

const navigate = vi.fn();
const listWorkflows = vi.fn();
const listAllActionLogs = vi.fn();
const notifyApiError = vi.fn();

vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));
vi.mock('@/lib/api/workflows', () => ({ listWorkflows: () => listWorkflows() }));
vi.mock('@/lib/api/action-logs', () => ({ listAllActionLogs: () => listAllActionLogs() }));
vi.mock('@/lib/api/error-toast', () => ({ notifyApiError: (e: unknown) => notifyApiError(e) }));

function workflow(id: string, name: string): Workflow {
  return {
    id,
    name,
    schemaVersion: 1,
    graph: {
      nodes: [
        { id: 'start', type: 'start', position: { x: 0, y: 0 }, data: {} },
        { id: 'email', type: 'email', position: { x: 0, y: 0 }, data: { notifySecretariat: true } },
        { id: 'sms', type: 'sms', position: { x: 0, y: 0 }, data: { notifySecretariat: true } },
        { id: 'end', type: 'end', position: { x: 0, y: 0 }, data: {} },
      ],
      // start → email → sms → end: a relance on `email` still has `sms` ahead, so
      // a failure there (with nothing scheduled) reads as a stalled journey.
      edges: [
        { id: 'e1', source: 'start', target: 'email' },
        { id: 'e2', source: 'email', target: 'sms' },
        { id: 'e3', source: 'sms', target: 'end' },
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
    settings: { notificationEmail: 'secretariat@labo.fr' },
    createdAt: new Date('2026-05-01'),
    updatedAt: new Date('2026-05-20'),
  };
}

function log(partial: Partial<ActionLog> & { patientId: string }): ActionLog {
  return {
    id: `log_${Math.random().toString(36).slice(2)}`,
    workflowId: 'wf_1',
    nodeId: 'email',
    channel: 'email',
    status: 'sent',
    occurredAt: new Date(),
    ...partial,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  listWorkflows.mockResolvedValue([workflow('wf_1', 'Relance J+7')]);
  listAllActionLogs.mockResolvedValue([]);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('DashboardPage', () => {
  it('shows the empty state when no action log exists', async () => {
    renderPage();
    expect(await screen.findByText('Aucun patient en suivi')).toBeInTheDocument();
  });

  it('renders the error state and retries the load', async () => {
    listWorkflows.mockRejectedValueOnce(new Error('boom'));
    renderPage();

    const retry = await screen.findByRole('button', { name: 'Réessayer' });
    expect(notifyApiError).toHaveBeenCalledTimes(1);

    fireEvent.click(retry);
    expect(await screen.findByText('Aucun patient en suivi')).toBeInTheDocument();
  });

  it('derives patient rows and counts the blocked patient in its stat card', async () => {
    listAllActionLogs.mockResolvedValue([
      log({ patientId: 'pat_jean.dupont_a1b2', status: 'sent' }),
      log({ patientId: 'pat_marie.curie_c3d4', status: 'failed' }),
    ]);
    renderPage();

    expect(await screen.findByText('Jean Dupont')).toBeInTheDocument();
    expect(screen.getByText('Marie Curie')).toBeInTheDocument();
    // Bloqués card: Marie has a failed relance → value 1.
    const blocked = screen.getByText('Bloqués').closest('div')?.parentElement;
    expect(blocked).toHaveTextContent('1');
  });

  it('navigates to the patient preview on row click', async () => {
    listAllActionLogs.mockResolvedValue([log({ patientId: 'pat_jean.dupont_a1b2' })]);
    renderPage();

    fireEvent.click(await screen.findByText('Jean Dupont'));
    expect(navigate).toHaveBeenCalledWith(
      expect.stringContaining('/workflows/wf_1/preview?patientId=pat_jean.dupont_a1b2'),
    );
  });

  it('opens the workflow link without navigating to the preview', async () => {
    listAllActionLogs.mockResolvedValue([log({ patientId: 'pat_jean.dupont_a1b2' })]);
    renderPage();
    await screen.findByText('Jean Dupont');

    // The workflow-name button stops propagation → edit route, not preview.
    fireEvent.click(screen.getByRole('button', { name: 'Relance J+7' }));
    expect(navigate).toHaveBeenCalledWith('/workflows/wf_1/edit');
  });

  it('filters the table by status', async () => {
    listAllActionLogs.mockResolvedValue([
      log({ patientId: 'pat_jean.dupont_a1b2', status: 'sent' }),
      log({ patientId: 'pat_marie.curie_c3d4', status: 'failed' }),
    ]);
    renderPage();
    await screen.findByText('Jean Dupont');

    fireEvent.keyDown(screen.getByLabelText('Filtrer par statut'), { key: 'Enter' });
    fireEvent.click(await screen.findByRole('option', { name: 'Bloqués' }));

    await waitFor(() => expect(screen.queryByText('Jean Dupont')).not.toBeInTheDocument());
    expect(screen.getByText('Marie Curie')).toBeInTheDocument();
  });
});
