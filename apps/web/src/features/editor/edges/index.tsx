import { useState } from 'react';

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
  type EdgeTypes,
} from '@xyflow/react';
import { Trash2 } from 'lucide-react';

import { cn } from '@/lib/utils';

import { useNodeActions } from '../nodes/node-actions-context';

/**
 * Default editor edge (I-07 batch 2): a bezier link that reveals a trash
 * button at its midpoint on hover — the edge counterpart to the node trash.
 * Double-clicking the edge still deletes it (wired on the canvas). Hidden in
 * read-only preview.
 *
 * Hover is tracked locally: a wide transparent overlay path makes the link easy
 * to hover, and the button keeps the hover alive while the pointer is on it.
 */
function DeletableEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
}: EdgeProps) {
  const { onRemoveEdge, readOnly } = useNodeActions();
  const [hovered, setHovered] = useState(false);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      {/* Wide invisible hit area so the thin edge is easy to hover. */}
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={20}
        className="react-flow__edge-interaction"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      {!readOnly && (
        <EdgeLabelRenderer>
          <div
            data-testid={`edge-trash-${id}`}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: hovered ? 'all' : 'none',
            }}
            className={cn('transition-opacity duration-150', hovered ? 'opacity-100' : 'opacity-0')}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <button
              type="button"
              aria-label="Supprimer ce lien"
              className="nodrag nopan flex h-7 w-7 items-center justify-center rounded-full border bg-white text-slate-500 shadow-sm transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
              onClick={(event) => {
                event.stopPropagation();
                onRemoveEdge?.(id);
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const DeletableEdge = DeletableEdgeComponent;

/**
 * Override the `default` edge type so every type-less edge (all of them, in
 * this editor) renders with the deletable behaviour.
 */
export const edgeTypes = {
  default: DeletableEdge,
} satisfies EdgeTypes;
