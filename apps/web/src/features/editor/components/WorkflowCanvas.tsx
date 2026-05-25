import { useCallback, useEffect, useMemo, useRef, type DragEvent } from 'react';

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

import { NODE_TYPES, type NodeType, type Position, type Viewport } from '@rainpath/schemas';

import type { AppEdge, AppNode } from '../hooks/useWorkflowEditor';
import { applyAutoLayout } from '../lib/auto-layout';
import { DND_NODE_TYPE } from '../lib/node-catalog';
import { nodeTypes } from '../nodes';
import { NodeActionsContext } from '../nodes/node-actions-context';
import { NodeToolbar } from './NodeToolbar';

function isNodeType(value: string): value is NodeType {
  return (NODE_TYPES as readonly string[]).includes(value);
}

export interface WorkflowCanvasProps {
  nodes: AppNode[];
  edges: AppEdge[];
  onNodesChange: (changes: NodeChange<AppNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<AppEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  onAddNode: (type: NodeType, position: Position) => void;
  onNodeClick?: (id: string) => void;
  onPaneClick?: () => void;
  onViewportChange?: (viewport: Viewport) => void;
  /** Quick-delete a node from its in-card trash affordance (I-07 batch 2). */
  onRemoveNode?: (id: string) => void;
  /** Quick-delete an edge by double-clicking it (I-07 batch 2). */
  onRemoveEdge?: (id: string) => void;
  /** Run dagre once on mount (existing workflow reloaded with no viewport). */
  autoLayoutOnMount?: boolean;
  /** Preview mode (I-05): disables editing interactions and the palette. */
  readOnly?: boolean;
}

/** Inner canvas — lives under ReactFlowProvider so it can use `useReactFlow`. */
function CanvasArea({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onAddNode,
  onNodeClick,
  onPaneClick,
  onViewportChange,
  onRemoveNode,
  onRemoveEdge,
  autoLayoutOnMount,
  readOnly,
}: WorkflowCanvasProps) {
  const { screenToFlowPosition } = useReactFlow();
  const didLayout = useRef(false);

  // Stable context value so node re-renders are driven by state, not identity.
  const nodeActions = useMemo(() => ({ onRemoveNode, readOnly }), [onRemoveNode, readOnly]);

  useEffect(() => {
    if (didLayout.current || !autoLayoutOnMount || nodes.length === 0) return;
    didLayout.current = true;
    const laidOut = applyAutoLayout(nodes, edges);
    onNodesChange(
      laidOut.map((n) => ({ id: n.id, type: 'position', position: n.position, dragging: false })),
    );
    // One-shot on mount only; deps intentionally omitted.
  }, []);

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData(DND_NODE_TYPE);
      if (!isNodeType(type)) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      onAddNode(type, position);
    },
    [screenToFlowPosition, onAddNode],
  );

  return (
    <div
      data-testid="canvas-dropzone"
      className="relative h-full flex-1"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <NodeActionsContext.Provider value={nodeActions}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, node) => onNodeClick?.(node.id)}
          onEdgeDoubleClick={readOnly ? undefined : (_, edge) => onRemoveEdge?.(edge.id)}
          onPaneClick={onPaneClick}
          onMoveEnd={(_, viewport) => onViewportChange?.(viewport)}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          elementsSelectable={!readOnly}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={18}
            size={1}
            color="rgba(15,23,42,0.15)"
          />
          <MiniMap pannable zoomable />
          <Controls />
        </ReactFlow>
      </NodeActionsContext.Provider>
    </div>
  );
}

/**
 * Workflow editor canvas (B-03): left palette + React Flow surface. React Flow
 * stays in controlled mode (ADR-003) — every interaction is relayed to the
 * `useWorkflowEditor` hook through the callbacks above.
 */
export function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <div className="flex h-full w-full">
        {!props.readOnly && <NodeToolbar />}
        <CanvasArea {...props} />
      </div>
    </ReactFlowProvider>
  );
}
