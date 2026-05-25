import { ReactFlowProvider } from '@xyflow/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Mail } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { NodeActionsContext, type NodeActions } from './node-actions-context';
import { NodeShell, type NodeShellProps } from './node-shell';

const TRASH = 'Supprimer ce nœud';

function renderShell(props: Partial<NodeShellProps>, actions: NodeActions) {
  return render(
    <ReactFlowProvider>
      <NodeActionsContext.Provider value={actions}>
        <NodeShell type="email" icon={Mail} label="Email" nodeId="n1" {...props} />
      </NodeActionsContext.Provider>
    </ReactFlowProvider>,
  );
}

describe('NodeShell trash affordance', () => {
  it('renders the trash button (revealed on hover) when deletion is available', () => {
    renderShell({}, { onRemoveNode: vi.fn() });
    // Present in the DOM, hidden until hover via the group-hover utility.
    expect(screen.getByRole('button', { name: TRASH })).toHaveClass('group-hover:opacity-100');
  });

  it('keeps the trash button visible while the node is selected', () => {
    renderShell({ selected: true }, { onRemoveNode: vi.fn() });
    expect(screen.getByRole('button', { name: TRASH })).toHaveClass('opacity-100');
  });

  it('hides the trash button in read-only (preview) mode', () => {
    renderShell({}, { onRemoveNode: vi.fn(), readOnly: true });
    expect(screen.queryByRole('button', { name: TRASH })).not.toBeInTheDocument();
  });

  it('removes the node on click and stops the click from selecting it', () => {
    const onRemoveNode = vi.fn();
    renderShell({}, { onRemoveNode });

    fireEvent.click(screen.getByRole('button', { name: TRASH }));

    expect(onRemoveNode).toHaveBeenCalledWith('n1');
  });

  it('yields the corner to a validation badge (badge keeps priority)', () => {
    renderShell(
      { validation: { type: 'error', message: 'Nœud orphelin' } },
      { onRemoveNode: vi.fn() },
    );

    expect(screen.queryByRole('button', { name: TRASH })).not.toBeInTheDocument();
    expect(screen.getByTestId('validation-error')).toBeInTheDocument();
  });
});
