import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ONBOARDING_STORAGE_KEY } from '@/lib/hooks/useOnboarding';

import { AppLayout } from './app-layout';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppLayout />
    </MemoryRouter>,
  );
}

describe('AppLayout', () => {
  // Mark onboarding as seen so its modal does not auto-open and hide the topbar
  // (an open Radix Dialog marks sibling content aria-hidden).
  beforeEach(() => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders the brand logo and both nav links', () => {
    renderAt('/');
    expect(screen.getByAltText('RainPath')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Workflows' })).toBeInTheDocument();
  });

  it('marks the Dashboard link active on the root route', () => {
    renderAt('/');
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveClass('bg-accent');
    expect(screen.getByRole('link', { name: 'Workflows' })).not.toHaveClass('bg-accent');
  });

  it('marks the Workflows link active on the /workflows route', () => {
    renderAt('/workflows');
    expect(screen.getByRole('link', { name: 'Workflows' })).toHaveClass('bg-accent');
    // `end` on Dashboard prevents it from matching nested paths.
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveClass('bg-accent');
  });

  it('auto-opens the onboarding dialog on first visit', () => {
    localStorage.clear();
    renderAt('/');
    expect(screen.getByText('Bienvenue sur RainPath')).toBeInTheDocument();
  });

  it('reopens the onboarding via the topbar help button', () => {
    renderAt('/');
    // Seen flag set → dialog starts closed.
    expect(screen.queryByText('Bienvenue sur RainPath')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Aide / Présentation' }));
    expect(screen.getByText('Bienvenue sur RainPath')).toBeInTheDocument();
  });
});
