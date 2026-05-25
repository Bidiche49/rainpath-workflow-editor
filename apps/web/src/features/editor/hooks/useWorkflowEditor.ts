import { useCallback, useState } from 'react';

import {
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react';

import {
  WorkflowGraphSchema,
  type NodeType,
  type Position,
  type Viewport,
  type Workflow,
  type WorkflowGraph,
  type WorkflowNode,
  type WorkflowSettings,
} from '@rainpath/schemas';

/**
 * `useWorkflowEditor` — single owner of the editor state (ADR-003).
 *
 * React Flow runs in *controlled* mode: the canvas is a pure render layer over
 * this hook's `{ nodes, edges, viewport, settings }`. Keeping the state here
 * (not inside the canvas) makes it unit-testable in isolation and makes
 * persistence trivial — `serialize()` round-trips through the canonical
 * `WorkflowGraphSchema`.
 */

/** Union of every node `data` payload, derived from the canonical schema. */
export type AppNodeData = WorkflowNode['data'];
/** React Flow node carrying a canonical data payload. */
export type AppNode = Node<AppNodeData>;
/** React Flow edge (the canonical `EdgeSchema` is a structural subset). */
export type AppEdge = Edge;

/**
 * Normalized snapshot used to detect unsaved changes (I-08). It deliberately
 * omits the viewport: panning or zooming the canvas is a view-only gesture, not
 * a business edit, so it must never flag the editor dirty. `serialize()` keeps
 * the viewport because the save *does* persist the preferred camera position.
 */
export interface DirtyCheckSnapshot {
  nodes: WorkflowGraph['nodes'];
  edges: WorkflowGraph['edges'];
  settings: WorkflowSettings;
}

const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };
const DEFAULT_SETTINGS: WorkflowSettings = { notificationEmail: '' };

/** Default `data` payload for a freshly dropped node of the given type. */
function defaultData(type: NodeType): AppNodeData {
  switch (type) {
    case 'start':
      return { label: 'Début' };
    case 'end':
      return { label: 'Fin' };
    case 'email':
      return { label: 'Email', content: '', notifySecretariat: true };
    case 'sms':
      return { label: 'SMS', content: '', notifySecretariat: true };
    case 'whatsapp':
      return { label: 'WhatsApp', content: '', notifySecretariat: true };
    case 'letter':
      return { label: 'Courrier', content: '', notifySecretariat: true };
    case 'wait':
      return { label: 'Attente', delay: { value: 1, unit: 'days' } };
    case 'condition':
      return { label: 'Condition', condition: 'Condition ?' };
  }
}

/** Collision-resistant id for a new node/edge (crypto.randomUUID, modern target). */
function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export interface UseWorkflowEditor {
  nodes: AppNode[];
  edges: AppEdge[];
  viewport: Viewport;
  settings: WorkflowSettings;
  init: (workflow?: Workflow) => void;
  addNode: (type: NodeType, position: Position) => AppNode;
  removeNode: (id: string) => void;
  updateNodeData: (id: string, patch: Partial<AppNodeData>) => void;
  connectEdge: (connection: Connection) => void;
  removeEdge: (id: string) => void;
  setViewport: (viewport: Viewport) => void;
  updateSettings: (patch: Partial<WorkflowSettings>) => void;
  onNodesChange: (changes: NodeChange<AppNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<AppEdge>[]) => void;
  setFromGraph: (graph: WorkflowGraph) => void;
  serialize: () => WorkflowGraph;
  serializeForDirtyCheck: () => DirtyCheckSnapshot;
}

export function useWorkflowEditor(initial?: Workflow): UseWorkflowEditor {
  const [nodes, setNodes] = useState<AppNode[]>(() =>
    initial ? (initial.graph.nodes as AppNode[]) : [],
  );
  const [edges, setEdges] = useState<AppEdge[]>(() => (initial ? initial.graph.edges : []));
  const [viewport, setViewportState] = useState<Viewport>(
    () => initial?.graph.viewport ?? DEFAULT_VIEWPORT,
  );
  const [settings, setSettings] = useState<WorkflowSettings>(
    () => initial?.settings ?? DEFAULT_SETTINGS,
  );

  const setFromGraph = useCallback((graph: WorkflowGraph) => {
    setNodes(graph.nodes as AppNode[]);
    setEdges(graph.edges);
    setViewportState(graph.viewport);
  }, []);

  const init = useCallback(
    (workflow?: Workflow) => {
      if (workflow) {
        setFromGraph(workflow.graph);
        setSettings(workflow.settings);
      } else {
        setNodes([]);
        setEdges([]);
        setViewportState(DEFAULT_VIEWPORT);
        setSettings(DEFAULT_SETTINGS);
      }
    },
    [setFromGraph],
  );

  const addNode = useCallback((type: NodeType, position: Position): AppNode => {
    const node: AppNode = {
      id: makeId(type),
      type,
      position,
      data: defaultData(type),
    };
    setNodes((current) => [...current, node]);
    return node;
  }, []);

  const removeNode = useCallback((id: string) => {
    setNodes((current) => current.filter((n) => n.id !== id));
    // A node never leaves dangling edges behind.
    setEdges((current) => current.filter((e) => e.source !== id && e.target !== id));
  }, []);

  const updateNodeData = useCallback((id: string, patch: Partial<AppNodeData>) => {
    setNodes((current) =>
      current.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
    );
  }, []);

  const connectEdge = useCallback((connection: Connection) => {
    const { source, target } = connection;
    if (!source || !target) return;
    const sourceHandle = connection.sourceHandle ?? null;
    const targetHandle = connection.targetHandle ?? null;
    setEdges((current) => {
      const exists = current.some(
        (e) =>
          e.source === source &&
          e.target === target &&
          (e.sourceHandle ?? null) === sourceHandle &&
          (e.targetHandle ?? null) === targetHandle,
      );
      if (exists) return current;
      const edge: AppEdge = {
        id: makeId('edge'),
        source,
        target,
        sourceHandle,
        targetHandle,
      };
      return [...current, edge];
    });
  }, []);

  const removeEdge = useCallback((id: string) => {
    setEdges((current) => current.filter((e) => e.id !== id));
  }, []);

  const setViewport = useCallback((next: Viewport) => {
    setViewportState(next);
  }, []);

  const updateSettings = useCallback((patch: Partial<WorkflowSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const onNodesChange = useCallback((changes: NodeChange<AppNode>[]) => {
    setNodes((current) => applyNodeChanges(changes, current));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange<AppEdge>[]) => {
    setEdges((current) => applyEdgeChanges(changes, current));
  }, []);

  const serialize = useCallback(
    (): WorkflowGraph =>
      // Zod strips React Flow's transient fields (selected, measured, …) and
      // validates the result on the way out — guaranteeing a persistable graph.
      WorkflowGraphSchema.parse({ nodes, edges, viewport }),
    [nodes, edges, viewport],
  );

  const serializeForDirtyCheck = useCallback((): DirtyCheckSnapshot => {
    // Reuse the same Zod normalization (drops transient fields) but discard the
    // viewport: only nodes, edges and settings count as real, persisted edits.
    const normalized = WorkflowGraphSchema.parse({ nodes, edges, viewport });
    return { nodes: normalized.nodes, edges: normalized.edges, settings };
  }, [nodes, edges, viewport, settings]);

  return {
    nodes,
    edges,
    viewport,
    settings,
    init,
    addNode,
    removeNode,
    updateNodeData,
    connectEdge,
    removeEdge,
    setViewport,
    updateSettings,
    onNodesChange,
    onEdgesChange,
    setFromGraph,
    serialize,
    serializeForDirtyCheck,
  };
}
