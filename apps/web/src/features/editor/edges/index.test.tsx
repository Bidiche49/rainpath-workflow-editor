import { Position, type EdgeProps } from '@xyflow/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Edges don't render in jsdom (nodes are never measured) and EdgeLabelRenderer
// needs React Flow's portal. Stub those primitives so the edge's hover/delete
// wiring can be unit-tested directly.
vi.mock('@xyflow/react', async (orig) => {
  const actual = await orig<typeof import('@xyflow/react')>();
  return {
    ...actual,
    BaseEdge: () => null,
    EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    getBezierPath: () => ['M0,0L1,1', 50, 50],
  };
});

import { NodeActionsContext, type NodeActions } from '../nodes/node-actions-context';
import { DeletableEdge } from './index';

function edgeProps(): EdgeProps {
  return {
    id: 'e1',
    source: 'a',
    target: 'b',
    sourceX: 0,
    sourceY: 0,
    targetX: 1,
    targetY: 1,
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
  } as unknown as EdgeProps;
}

function renderEdge(actions: NodeActions) {
  return render(
    <NodeActionsContext.Provider value={actions}>
      <DeletableEdge {...edgeProps()} />
    </NodeActionsContext.Provider>,
  );
}

describe('DeletableEdge', () => {
  it('removes the edge when the (hover-revealed) trash is clicked', () => {
    const onRemoveEdge = vi.fn();
    const { container } = renderEdge({ onRemoveEdge });

    // Hover the interaction overlay to reveal the trash.
    const overlay = container.querySelector('.react-flow__edge-interaction');
    expect(overlay).not.toBeNull();
    fireEvent.mouseEnter(overlay as Element);

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer ce lien' }));

    expect(onRemoveEdge).toHaveBeenCalledWith('e1');
  });

  it('keeps the trash hidden until hover (opacity-0)', () => {
    renderEdge({ onRemoveEdge: vi.fn() });
    expect(screen.getByTestId('edge-trash-e1')).toHaveClass('opacity-0');
  });

  it('renders no trash in read-only (preview) mode', () => {
    renderEdge({ onRemoveEdge: vi.fn(), readOnly: true });
    expect(screen.queryByTestId('edge-trash-e1')).not.toBeInTheDocument();
  });
});
