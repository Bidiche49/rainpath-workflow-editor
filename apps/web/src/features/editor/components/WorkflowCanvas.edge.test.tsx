import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// jsdom never measures nodes, so React Flow draws no edges to double-click.
// Stub <ReactFlow> with a surface that forwards a double-click to the real
// onEdgeDoubleClick wiring, which is the behaviour under test.
vi.mock('@xyflow/react', async (orig) => {
  const actual = await orig<typeof import('@xyflow/react')>();
  return {
    ...actual,
    ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useReactFlow: () => ({ screenToFlowPosition: () => ({ x: 0, y: 0 }) }),
    Background: () => null,
    MiniMap: () => null,
    Controls: () => null,
    ReactFlow: ({
      children,
      onEdgeDoubleClick,
    }: {
      children?: React.ReactNode;
      onEdgeDoubleClick?: (event: unknown, edge: { id: string }) => void;
    }) => (
      <div>
        <button data-testid="rf-edge" onDoubleClick={(e) => onEdgeDoubleClick?.(e, { id: 'e1' })}>
          edge
        </button>
        {children}
      </div>
    ),
  };
});

import { WorkflowCanvas, type WorkflowCanvasProps } from './WorkflowCanvas';

function baseProps(overrides: Partial<WorkflowCanvasProps> = {}): WorkflowCanvasProps {
  return {
    nodes: [],
    edges: [],
    onNodesChange: vi.fn(),
    onEdgesChange: vi.fn(),
    onConnect: vi.fn(),
    onAddNode: vi.fn(),
    ...overrides,
  };
}

describe('WorkflowCanvas edge deletion', () => {
  it('removes an edge when it is double-clicked', () => {
    const onRemoveEdge = vi.fn();
    render(<WorkflowCanvas {...baseProps({ onRemoveEdge })} />);

    fireEvent.doubleClick(screen.getByTestId('rf-edge'));

    expect(onRemoveEdge).toHaveBeenCalledWith('e1');
  });

  it('ignores edge double-click in read-only (preview) mode', () => {
    const onRemoveEdge = vi.fn();
    render(<WorkflowCanvas {...baseProps({ onRemoveEdge, readOnly: true })} />);

    fireEvent.doubleClick(screen.getByTestId('rf-edge'));

    expect(onRemoveEdge).not.toHaveBeenCalled();
  });
});
