import type { ActionLog, Workflow } from '@rainpath/schemas';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { WorkflowPreviewPage } from './workflow-preview-page';

const navigate = vi.fn();
const getWorkflow = vi.fn();
const listActionLogs = vi.fn();
const createActionLog = vi.fn();
const updateActionLog = vi.fn();
const toastSuccess = vi.fn();
const notifyApiError = vi.fn();

// Mutable so a single test can simulate the "no patient selected" route.
let patientIdParam: string | null = 'pat_jean.dupont_a1b2';

vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
  useParams: () => ({ id: 'wf_1' }),
  useSearchParams: () => [
    new URLSearchParams(patientIdParam ? { patientId: patientIdParam } : {}),
    vi.fn(),
  ],
}));
vi.mock('@/lib/api/workflows', () => ({ getWorkflow: (...a: unknown[]) => getWorkflow(...a) }));
vi.mock('@/lib/api/action-logs', () => ({
  listActionLogs: (...a: unknown[]) => listActionLogs(...a),
  createActionLog: (...a: unknown[]) => createActionLog(...a),
  updateActionLog: (...a: unknown[]) => updateActionLog(...a),
}));
vi.mock('@/lib/api/error-toast', () => ({ notifyApiError: (e: unknown) => notifyApiError(e) }));
vi.mock('sonner', () => ({ toast: { success: (m: string) => toastSuccess(m) } }));

const workflow: Workflow = {
  id: 'wf_1',
  name: 'Relance J+7',
  schemaVersion: 1,
  graph: {
    nodes: [
      { id: 'start', type: 'start', position: { x: 0, y: 0 }, data: {} },
      { id: 'email', type: 'email', position: { x: 0, y: 120 }, data: { notifySecretariat: true } },
      { id: 'end', type: 'end', position: { x: 0, y: 240 }, data: {} },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'email' },
      { id: 'e2', source: 'email', target: 'end' },
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
  },
  settings: { notificationEmail: 'secretariat@labo.fr' },
  createdAt: new Date('2026-05-01'),
  updatedAt: new Date('2026-05-20'),
};

function log(partial: Partial<ActionLog> = {}): ActionLog {
  return {
    id: `log_${Math.random().toString(36).slice(2)}`,
    patientId: 'pat_jean.dupont_a1b2',
    workflowId: 'wf_1',
    nodeId: 'email',
    channel: 'email',
    status: 'sent',
    message: 'Email envoyé',
    occurredAt: new Date('2026-05-20'),
    ...partial,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <WorkflowPreviewPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  patientIdParam = 'pat_jean.dupont_a1b2';
  getWorkflow.mockResolvedValue(workflow);
  listActionLogs.mockResolvedValue([]);
  createActionLog.mockResolvedValue(log());
  updateActionLog.mockResolvedValue(log());
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('WorkflowPreviewPage', () => {
  it('asks to pick a patient when no patientId is in the URL', () => {
    patientIdParam = null;
    renderPage();
    expect(screen.getByText('Aucun patient sélectionné')).toBeInTheDocument();
  });

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
    expect(await screen.findByText('Relance J+7')).toBeInTheDocument();
  });

  it('renders the patient name and an empty timeline', async () => {
    renderPage();
    expect(await screen.findByText('Jean Dupont')).toBeInTheDocument();
    expect(screen.getByText('Aucune action enregistrée pour ce patient.')).toBeInTheDocument();
  });

  it('lists existing action logs in the timeline', async () => {
    listActionLogs.mockResolvedValue([log({ message: 'Email envoyé' })]);
    renderPage();
    expect(await screen.findByText('Email envoyé')).toBeInTheDocument();
    expect(screen.getByText(/1 action enregistrée/)).toBeInTheDocument();
  });

  it('simulates the next step, persisting a coherent action log', async () => {
    renderPage();
    const button = await screen.findByRole('button', { name: /Simuler l'étape suivante/i });

    fireEvent.click(button);

    await waitFor(() => expect(createActionLog).toHaveBeenCalledTimes(1));
    expect(createActionLog.mock.calls[0]?.[0]).toMatchObject({
      patientId: 'pat_jean.dupont_a1b2',
      workflowId: 'wf_1',
      nodeId: 'email',
      channel: 'email',
    });
    // A success is recorded, never a random failure.
    expect(createActionLog.mock.calls[0]?.[0]).toMatchObject({ status: 'sent' });
    expect(updateActionLog).not.toHaveBeenCalled();
    expect(toastSuccess).toHaveBeenCalledWith('Étape simulée');
    // Logs are refetched after a successful simulation.
    await waitFor(() => expect(listActionLogs).toHaveBeenCalledTimes(2));
  });

  it('fires a scheduled (pending) step in place instead of stacking a duplicate', async () => {
    // The next channel (email) is already scheduled → simulating consumes that
    // very log (Planifié → Envoyé), it does not create a second one.
    const pending = log({ id: 'log_pending', status: 'pending', message: 'Email planifié' });
    listActionLogs.mockResolvedValue([pending]);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Simuler l'étape suivante/i }));

    await waitFor(() => expect(updateActionLog).toHaveBeenCalledTimes(1));
    expect(updateActionLog.mock.calls[0]?.[0]).toBe('log_pending');
    expect(updateActionLog.mock.calls[0]?.[1]).toMatchObject({ status: 'sent' });
    expect(createActionLog).not.toHaveBeenCalled();
  });

  it('steps through a wait (no send) before firing the next channel', async () => {
    // start → wait → email → end : the first click only advances onto the wait,
    // the second click fires the email channel.
    getWorkflow.mockResolvedValue({
      ...workflow,
      graph: {
        nodes: [
          { id: 'start', type: 'start', position: { x: 0, y: 0 }, data: {} },
          {
            id: 'wait',
            type: 'wait',
            position: { x: 0, y: 80 },
            data: { delay: { value: 3, unit: 'days' } },
          },
          {
            id: 'email',
            type: 'email',
            position: { x: 0, y: 160 },
            data: { notifySecretariat: true },
          },
          { id: 'end', type: 'end', position: { x: 0, y: 240 }, data: {} },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'wait' },
          { id: 'e2', source: 'wait', target: 'email' },
          { id: 'e3', source: 'email', target: 'end' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
    });
    renderPage();

    // 1st click: advance onto the wait — nothing is sent or persisted.
    fireEvent.click(await screen.findByRole('button', { name: /Simuler l'étape suivante/i }));
    expect(createActionLog).not.toHaveBeenCalled();

    // 2nd click: now on the email channel → it fires.
    fireEvent.click(screen.getByRole('button', { name: /Simuler l'étape suivante/i }));
    await waitFor(() => expect(createActionLog).toHaveBeenCalledTimes(1));
    expect(createActionLog.mock.calls[0]?.[0]).toMatchObject({ nodeId: 'email', channel: 'email' });
  });

  it('disables the simulate button once the patient reached the End node', async () => {
    listActionLogs.mockResolvedValue([log({ nodeId: 'end', channel: 'email' })]);
    renderPage();
    await screen.findByText('Jean Dupont');

    expect(screen.getByRole('button', { name: /Simuler l'étape suivante/i })).toBeDisabled();
  });
});
