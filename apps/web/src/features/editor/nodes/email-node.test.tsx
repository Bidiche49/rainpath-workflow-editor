import { ReactFlow, ReactFlowProvider } from '@xyflow/react';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { nodeTypes } from './index';

/** Mounts a full React Flow so the store carries the edge list the handles read. */
function renderFlow(edges: { id: string; source: string; target: string }[]) {
  return render(
    <ReactFlowProvider>
      <div style={{ width: 400, height: 400 }}>
        <ReactFlow
          nodeTypes={nodeTypes}
          nodes={[
            { id: 'a', type: 'email', position: { x: 0, y: 0 }, data: { notifySecretariat: true } },
            { id: 'b', type: 'end', position: { x: 0, y: 200 }, data: {} },
          ]}
          edges={edges}
        />
      </div>
    </ReactFlowProvider>,
  );
}

describe('channel node handle connection state', () => {
  it('fills the handle with the channel colour once connected', async () => {
    const { container } = renderFlow([{ id: 'e', source: 'a', target: 'b' }]);

    await waitFor(() => {
      const handles = Array.from(container.querySelectorAll('.react-flow__handle'));
      expect(handles.some((h) => h.classList.contains('bg-channel-email-500'))).toBe(true);
    });
  });

  it('leaves handles white while nothing is connected', async () => {
    const { container } = renderFlow([]);

    await waitFor(() => {
      const handles = Array.from(container.querySelectorAll('.react-flow__handle'));
      expect(handles.length).toBeGreaterThan(0);
      expect(handles.some((h) => h.classList.contains('bg-channel-email-500'))).toBe(false);
      expect(handles.every((h) => h.classList.contains('bg-white'))).toBe(true);
    });
  });
});
