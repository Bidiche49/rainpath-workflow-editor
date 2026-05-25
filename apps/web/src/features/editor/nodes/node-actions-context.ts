import { createContext, useContext } from 'react';

/**
 * Editor actions made available to custom nodes (I-07 batch 2).
 *
 * Custom nodes only receive React Flow's `NodeProps`, so the canvas exposes the
 * controlled-editor mutations they need (node deletion) through this context
 * rather than threading them as ad-hoc node `data`. `readOnly` mirrors the
 * canvas mode so nodes hide destructive affordances in the patient preview.
 */
export interface NodeActions {
  onRemoveNode?: (id: string) => void;
  readOnly?: boolean;
}

export const NodeActionsContext = createContext<NodeActions>({});

export function useNodeActions(): NodeActions {
  return useContext(NodeActionsContext);
}
