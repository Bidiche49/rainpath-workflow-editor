import { ReactFlowProvider, type NodeProps } from '@xyflow/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ConditionNode } from './index';

function nodeProps(data: Record<string, unknown> = {}): NodeProps {
  return { id: 'c1', data, selected: false } as unknown as NodeProps;
}

function renderCondition() {
  return render(
    <ReactFlowProvider>
      <ConditionNode {...nodeProps({ label: 'Email ouvert ?' })} />
    </ReactFlowProvider>,
  );
}

describe('ConditionNode Yes/No clarity', () => {
  it('renders explicit "Oui" and "Non" branch labels', () => {
    renderCondition();
    expect(screen.getByText('Oui')).toBeInTheDocument();
    expect(screen.getByText('Non')).toBeInTheDocument();
  });

  it('styles Oui/Non labels and handles with the condition violet', () => {
    const { container } = renderCondition();

    // Labels are violet (condition identity), never the harsh green/red.
    expect(screen.getByText('Oui')).toHaveClass('text-channel-condition-700');
    expect(screen.getByText('Non')).toHaveClass('text-channel-condition-700');

    // The branch handles share that violet.
    const borders = Array.from(container.querySelectorAll('.react-flow__handle')).flatMap((h) =>
      Array.from(h.classList),
    );
    expect(borders).toContain('border-channel-condition-500');
    expect(borders).not.toContain('border-emerald-500');
    expect(borders).not.toContain('border-red-500');
  });
});
