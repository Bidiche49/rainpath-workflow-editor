import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Workflow } from '@rainpath/schemas';

import { useWorkflowEditor } from './useWorkflowEditor';

function sampleWorkflow(): Workflow {
  return {
    id: 'wf-1',
    name: 'Démo',
    schemaVersion: 1,
    settings: { notificationEmail: 'secretariat@labo.fr' },
    graph: {
      nodes: [
        { id: 's', type: 'start', position: { x: 0, y: 0 }, data: { label: 'Début' } },
        {
          id: 'm',
          type: 'email',
          position: { x: 0, y: 120 },
          data: { label: 'Email', content: 'Bonjour', notifySecretariat: true },
        },
        { id: 'e', type: 'end', position: { x: 0, y: 240 }, data: { label: 'Fin' } },
      ],
      edges: [
        { id: 's-m', source: 's', target: 'm' },
        { id: 'm-e', source: 'm', target: 'e' },
      ],
      viewport: { x: 10, y: 20, zoom: 1.5 },
    },
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
  };
}

describe('useWorkflowEditor', () => {
  it('starts empty when no initial workflow is given', () => {
    const { result } = renderHook(() => useWorkflowEditor());
    expect(result.current.nodes).toEqual([]);
    expect(result.current.edges).toEqual([]);
    expect(result.current.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
    expect(result.current.settings).toEqual({ notificationEmail: '' });
  });

  it('hydrates from an initial workflow', () => {
    const { result } = renderHook(() => useWorkflowEditor(sampleWorkflow()));
    expect(result.current.nodes).toHaveLength(3);
    expect(result.current.edges).toHaveLength(2);
    expect(result.current.viewport).toEqual({ x: 10, y: 20, zoom: 1.5 });
    expect(result.current.settings.notificationEmail).toBe('secretariat@labo.fr');
  });

  it('init(workflow) loads it and init() resets to empty', () => {
    const { result } = renderHook(() => useWorkflowEditor());
    act(() => result.current.init(sampleWorkflow()));
    expect(result.current.nodes).toHaveLength(3);
    expect(result.current.settings.notificationEmail).toBe('secretariat@labo.fr');
    act(() => result.current.init());
    expect(result.current.nodes).toEqual([]);
    expect(result.current.settings).toEqual({ notificationEmail: '' });
  });

  it('addNode appends a node with type-specific default data', () => {
    const { result } = renderHook(() => useWorkflowEditor());
    let created: { id: string } | undefined;
    act(() => {
      created = result.current.addNode('wait', { x: 5, y: 6 });
    });
    expect(result.current.nodes).toHaveLength(1);
    const wait = result.current.nodes[0];
    expect(wait?.type).toBe('wait');
    expect(wait?.position).toEqual({ x: 5, y: 6 });
    expect(wait?.data).toMatchObject({ delay: { value: 1, unit: 'days' } });
    expect(wait?.id).toBe(created?.id);
  });

  it.each(['start', 'end', 'email', 'sms', 'whatsapp', 'letter', 'wait', 'condition'] as const)(
    'addNode produces valid default data for type %s',
    (type) => {
      const { result } = renderHook(() => useWorkflowEditor());
      act(() => {
        result.current.addNode(type, { x: 0, y: 0 });
      });
      const created = result.current.nodes[0];
      expect(created?.type).toBe(type);
      expect(created?.data).toBeDefined();
    },
  );

  it('addNode seeds channel nodes with notifySecretariat ON', () => {
    const { result } = renderHook(() => useWorkflowEditor());
    act(() => {
      result.current.addNode('email', { x: 0, y: 0 });
    });
    expect(result.current.nodes[0]?.data).toMatchObject({ notifySecretariat: true });
  });

  it('removeNode also drops the edges connected to it', () => {
    const { result } = renderHook(() => useWorkflowEditor(sampleWorkflow()));
    act(() => result.current.removeNode('m'));
    expect(result.current.nodes.map((n) => n.id)).toEqual(['s', 'e']);
    expect(result.current.edges).toEqual([]);
  });

  it('updateNodeData merges the patch into existing data', () => {
    const { result } = renderHook(() => useWorkflowEditor(sampleWorkflow()));
    act(() => result.current.updateNodeData('m', { content: 'Nouveau texte' }));
    const node = result.current.nodes.find((n) => n.id === 'm');
    expect(node?.data).toMatchObject({ label: 'Email', content: 'Nouveau texte' });
  });

  it('connectEdge adds an edge and dedupes identical connections', () => {
    const { result } = renderHook(() => useWorkflowEditor());
    act(() => {
      result.current.addNode('start', { x: 0, y: 0 });
    });
    const sourceId = result.current.nodes[0]!.id;
    act(() => {
      result.current.addNode('end', { x: 0, y: 100 });
    });
    const targetId = result.current.nodes[1]!.id;
    const connection = {
      source: sourceId,
      target: targetId,
      sourceHandle: null,
      targetHandle: null,
    };
    act(() => result.current.connectEdge(connection));
    act(() => result.current.connectEdge(connection));
    expect(result.current.edges).toHaveLength(1);
    expect(result.current.edges[0]).toMatchObject({ source: sourceId, target: targetId });
  });

  it('connectEdge ignores a connection with a missing endpoint', () => {
    const { result } = renderHook(() => useWorkflowEditor());
    act(() =>
      result.current.connectEdge({
        source: '',
        target: 'x',
        sourceHandle: null,
        targetHandle: null,
      }),
    );
    expect(result.current.edges).toEqual([]);
  });

  it('removeEdge removes the matching edge', () => {
    const { result } = renderHook(() => useWorkflowEditor(sampleWorkflow()));
    act(() => result.current.removeEdge('s-m'));
    expect(result.current.edges.map((e) => e.id)).toEqual(['m-e']);
  });

  it('setViewport and updateSettings update their slices', () => {
    const { result } = renderHook(() => useWorkflowEditor());
    act(() => result.current.setViewport({ x: 1, y: 2, zoom: 2 }));
    expect(result.current.viewport).toEqual({ x: 1, y: 2, zoom: 2 });
    act(() => result.current.updateSettings({ notificationEmail: 'a@b.fr' }));
    expect(result.current.settings.notificationEmail).toBe('a@b.fr');
  });

  it('onNodesChange applies a position change (controlled mode)', () => {
    const { result } = renderHook(() => useWorkflowEditor(sampleWorkflow()));
    act(() =>
      result.current.onNodesChange([
        { id: 's', type: 'position', position: { x: 99, y: 88 }, dragging: false },
      ]),
    );
    expect(result.current.nodes.find((n) => n.id === 's')?.position).toEqual({ x: 99, y: 88 });
  });

  it('onEdgesChange applies an edge removal (controlled mode)', () => {
    const { result } = renderHook(() => useWorkflowEditor(sampleWorkflow()));
    act(() => result.current.onEdgesChange([{ id: 's-m', type: 'remove' }]));
    expect(result.current.edges.map((e) => e.id)).toEqual(['m-e']);
  });

  it('setFromGraph replaces the graph but keeps settings', () => {
    const { result } = renderHook(() => useWorkflowEditor(sampleWorkflow()));
    act(() =>
      result.current.setFromGraph({
        nodes: [{ id: 'only', type: 'start', position: { x: 0, y: 0 }, data: {} }],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      }),
    );
    expect(result.current.nodes.map((n) => n.id)).toEqual(['only']);
    expect(result.current.settings.notificationEmail).toBe('secretariat@labo.fr');
  });

  it('serialize returns a Zod-valid graph stripped of transient React Flow fields', () => {
    const { result } = renderHook(() => useWorkflowEditor(sampleWorkflow()));
    act(() => {
      // simulate React Flow having decorated a node with transient props
      result.current.onNodesChange([{ id: 'm', type: 'select', selected: true }]);
    });
    const serialized = result.current.serialize();
    expect(serialized.nodes).toHaveLength(3);
    const email = serialized.nodes.find((n) => n.id === 'm');
    expect(email && 'selected' in email).toBe(false);
    expect(serialized.viewport).toEqual({ x: 10, y: 20, zoom: 1.5 });
  });

  it('serializeForDirtyCheck ignores viewport changes (pan/zoom is not a dirty edit)', () => {
    const { result } = renderHook(() => useWorkflowEditor(sampleWorkflow()));
    const before = JSON.stringify(result.current.serializeForDirtyCheck());
    act(() => result.current.setViewport({ x: 999, y: -42, zoom: 3 }));
    const after = JSON.stringify(result.current.serializeForDirtyCheck());
    expect(after).toEqual(before);
    // The snapshot carries no viewport at all.
    expect(result.current.serializeForDirtyCheck()).not.toHaveProperty('viewport');
  });

  it('serializeForDirtyCheck reflects a node or edge edit (real dirty change)', () => {
    const { result } = renderHook(() => useWorkflowEditor(sampleWorkflow()));
    const before = JSON.stringify(result.current.serializeForDirtyCheck());
    act(() => result.current.updateNodeData('m', { content: 'Texte modifié' }));
    expect(JSON.stringify(result.current.serializeForDirtyCheck())).not.toEqual(before);

    const afterNodeEdit = JSON.stringify(result.current.serializeForDirtyCheck());
    act(() => result.current.removeEdge('s-m'));
    expect(JSON.stringify(result.current.serializeForDirtyCheck())).not.toEqual(afterNodeEdit);
  });
});
