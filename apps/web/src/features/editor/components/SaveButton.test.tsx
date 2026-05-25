import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SaveButton } from './SaveButton';

describe('SaveButton', () => {
  it('disables the button and shows no pill when nothing has changed', () => {
    render(<SaveButton isDirty={false} errorCount={0} warningCount={0} onClick={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();
    expect(screen.queryByTestId('save-pill-clean')).not.toBeInTheDocument();
    expect(screen.queryByTestId('save-pill-warning')).not.toBeInTheDocument();
    expect(screen.queryByTestId('save-pill-error')).not.toBeInTheDocument();
  });

  it('shows the green pill when dirty without any issue', () => {
    render(<SaveButton isDirty errorCount={0} warningCount={0} onClick={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeEnabled();
    expect(screen.getByTestId('save-pill-clean')).toHaveClass('bg-emerald-500');
  });

  it('shows the amber pill when dirty with warnings only', () => {
    render(<SaveButton isDirty errorCount={0} warningCount={2} onClick={vi.fn()} />);

    expect(screen.getByTestId('save-pill-warning')).toHaveClass('bg-amber-500');
    expect(screen.queryByTestId('save-pill-clean')).not.toBeInTheDocument();
  });

  it('shows the red pill when dirty with critical errors', () => {
    render(<SaveButton isDirty errorCount={1} warningCount={0} onClick={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeEnabled();
    expect(screen.getByTestId('save-pill-error')).toHaveClass('bg-red-500');
  });
});
