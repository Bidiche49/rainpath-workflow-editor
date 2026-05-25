import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { OnboardingDialog } from './onboarding-dialog';

function renderDialog(overrides: Partial<Parameters<typeof OnboardingDialog>[0]> = {}) {
  const onClose = vi.fn();
  const onComplete = vi.fn();
  render(<OnboardingDialog open onClose={onClose} onComplete={onComplete} {...overrides} />);
  return { onClose, onComplete };
}

describe('OnboardingDialog', () => {
  it('renders the first step on mount', () => {
    renderDialog();
    expect(screen.getByText('Bienvenue sur RainPath')).toBeInTheDocument();
    expect(screen.getByText('Étape 1 / 5')).toBeInTheDocument();
    // Précédent is disabled on the first step.
    expect(screen.getByRole('button', { name: 'Précédent' })).toBeDisabled();
  });

  it('navigates forward and backward through the steps', () => {
    renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(screen.getByText('Composer un workflow')).toBeInTheDocument();
    expect(screen.getByText('Étape 2 / 5')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Précédent' }));
    expect(screen.getByText('Bienvenue sur RainPath')).toBeInTheDocument();
    expect(screen.getByText('Étape 1 / 5')).toBeInTheDocument();
  });

  it('calls onComplete when the user skips', () => {
    const { onComplete } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Passer' }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
