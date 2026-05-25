import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// `useBlocker` needs a data router whose real navigation (proceed) hits a
// `fetch`/AbortSignal path jsdom rejects. Mock it to a controllable blocker so
// we can unit-test the guard's branches deterministically.
const blocker = { state: 'unblocked' as string, proceed: vi.fn(), reset: vi.fn() };
vi.mock('react-router-dom', () => ({ useBlocker: () => blocker }));

import { UnsavedChangesGuard } from './UnsavedChangesGuard';

beforeEach(() => {
  blocker.state = 'unblocked';
  blocker.proceed.mockClear();
  blocker.reset.mockClear();
});

describe('UnsavedChangesGuard', () => {
  it('renders nothing when no navigation is blocked', () => {
    render(<UnsavedChangesGuard isDirty onSave={vi.fn().mockResolvedValue(true)} />);
    expect(screen.queryByText('Modifications non enregistrées')).not.toBeInTheDocument();
  });

  it('prompts when a navigation is blocked', () => {
    blocker.state = 'blocked';
    render(<UnsavedChangesGuard isDirty onSave={vi.fn().mockResolvedValue(true)} />);
    expect(screen.getByText('Modifications non enregistrées')).toBeInTheDocument();
  });

  it('leaves without saving via the destructive action', () => {
    blocker.state = 'blocked';
    const onSave = vi.fn().mockResolvedValue(true);
    render(<UnsavedChangesGuard isDirty onSave={onSave} />);

    fireEvent.click(screen.getByRole('button', { name: 'Quitter sans enregistrer' }));

    expect(blocker.proceed).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('cancels and stays on the page', () => {
    blocker.state = 'blocked';
    render(<UnsavedChangesGuard isDirty onSave={vi.fn().mockResolvedValue(true)} />);

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(blocker.reset).toHaveBeenCalledTimes(1);
  });

  it('saves then proceeds via the primary action', async () => {
    blocker.state = 'blocked';
    const onSave = vi.fn().mockResolvedValue(true);
    render(<UnsavedChangesGuard isDirty onSave={onSave} />);

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer puis quitter' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(blocker.proceed).toHaveBeenCalledTimes(1));
  });

  it('keeps the user on the page when the save fails', async () => {
    blocker.state = 'blocked';
    const onSave = vi.fn().mockResolvedValue(false);
    render(<UnsavedChangesGuard isDirty onSave={onSave} />);

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer puis quitter' }));

    await waitFor(() => expect(blocker.reset).toHaveBeenCalledTimes(1));
    expect(blocker.proceed).not.toHaveBeenCalled();
  });
});
