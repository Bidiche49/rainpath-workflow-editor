import { createContext, useContext } from 'react';

/**
 * Editor actions made available to custom nodes and edges (I-07 batch 2).
 *
 * Custom nodes/edges only receive React Flow's `NodeProps`/`EdgeProps`, so the
 * canvas exposes the controlled-editor mutations they need (node/edge deletion)
 * through this context rather than threading them as ad-hoc data. `readOnly`
 * mirrors the canvas mode so they hide destructive affordances in the preview.
 */
export interface NodeActions {
  onRemoveNode?: (id: string) => void;
  onRemoveEdge?: (id: string) => void;
  readOnly?: boolean;
}

export const NodeActionsContext = createContext<NodeActions>({});

export function useNodeActions(): NodeActions {
  return useContext(NodeActionsContext);
}
