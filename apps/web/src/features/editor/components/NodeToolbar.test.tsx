import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DND_NODE_TYPE, NODE_CATALOG } from '../lib/node-catalog';
import { NodeToolbar } from './NodeToolbar';

describe('NodeToolbar', () => {
  it('renders a draggable card for each of the 8 node types', () => {
    render(<NodeToolbar />);
    for (const entry of NODE_CATALOG) {
      expect(screen.getByTestId(`palette-${entry.type}`)).toBeInTheDocument();
    }
  });

  it('writes the node type onto the dataTransfer when a card drag starts', () => {
    render(<NodeToolbar />);
    const setData = vi.fn();
    const dataTransfer = { setData, effectAllowed: '' };

    fireEvent.dragStart(screen.getByTestId('palette-email'), { dataTransfer });

    expect(setData).toHaveBeenCalledWith(DND_NODE_TYPE, 'email');
    expect(dataTransfer.effectAllowed).toBe('move');
  });
});
