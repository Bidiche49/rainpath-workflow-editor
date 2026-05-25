import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { AppLayout } from './app-layout';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppLayout />
    </MemoryRouter>,
  );
}

describe('AppLayout', () => {
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
});
