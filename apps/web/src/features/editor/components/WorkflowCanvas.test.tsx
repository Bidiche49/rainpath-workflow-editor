import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DND_NODE_TYPE } from '../lib/node-catalog';
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

describe('WorkflowCanvas', () => {
  it('renders the palette alongside the canvas in edit mode', () => {
    render(<WorkflowCanvas {...baseProps()} />);
    expect(screen.getByTestId('palette-start')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-dropzone')).toBeInTheDocument();
  });

  it('hides the palette in read-only (preview) mode', () => {
    render(<WorkflowCanvas {...baseProps({ readOnly: true })} />);
    expect(screen.queryByTestId('palette-start')).not.toBeInTheDocument();
    expect(screen.getByTestId('canvas-dropzone')).toBeInTheDocument();
  });

  it('creates a node when a valid type is dropped on the canvas', () => {
    const onAddNode = vi.fn();
    render(<WorkflowCanvas {...baseProps({ onAddNode })} />);

    const dataTransfer = { getData: (key: string) => (key === DND_NODE_TYPE ? 'email' : '') };
    fireEvent.drop(screen.getByTestId('canvas-dropzone'), {
      clientX: 120,
      clientY: 80,
      dataTransfer,
    });

    expect(onAddNode).toHaveBeenCalledTimes(1);
    expect(onAddNode.mock.calls[0]?.[0]).toBe('email');
  });

  it('ignores a drop that carries no recognised node type', () => {
    const onAddNode = vi.fn();
    render(<WorkflowCanvas {...baseProps({ onAddNode })} />);

    const dataTransfer = { getData: () => 'not-a-node' };
    fireEvent.drop(screen.getByTestId('canvas-dropzone'), { dataTransfer });

    expect(onAddNode).not.toHaveBeenCalled();
  });

  it('runs dagre auto-layout once on mount when asked and nodes exist', () => {
    const onNodesChange = vi.fn();
    render(
      <WorkflowCanvas
        {...baseProps({
          autoLayoutOnMount: true,
          onNodesChange,
          nodes: [
            { id: 'a', type: 'start', position: { x: 0, y: 0 }, data: {} },
            { id: 'b', type: 'end', position: { x: 0, y: 0 }, data: {} },
          ],
          edges: [{ id: 'a-b', source: 'a', target: 'b' }],
        })}
      />,
    );
    expect(onNodesChange).toHaveBeenCalledTimes(1);
    const changes = onNodesChange.mock.calls[0]?.[0] as Array<{ type: string }>;
    expect(changes.every((c) => c.type === 'position')).toBe(true);
  });
});
