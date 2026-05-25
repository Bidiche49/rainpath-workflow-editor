import type { DragEvent } from 'react';

import { getChannelStyles } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

import {
  DND_NODE_TYPE,
  NODE_CATALOG,
  NODE_GROUP_LABELS,
  type NodePaletteEntry,
} from '../lib/node-catalog';

/** One draggable palette card (icon chip + label + description). */
function PaletteCard({ entry }: { entry: NodePaletteEntry }) {
  const styles = getChannelStyles(entry.type);
  const Icon = entry.icon;

  const handleDragStart = (event: DragEvent<HTMLButtonElement>) => {
    event.dataTransfer.setData(DND_NODE_TYPE, entry.type);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <button
      type="button"
      draggable
      onDragStart={handleDragStart}
      data-testid={`palette-${entry.type}`}
      className="flex w-full cursor-grab items-center gap-2.5 rounded-lg border border-border bg-card px-2.5 py-2 text-left transition-all hover:border-slate-300 hover:shadow-sm active:cursor-grabbing"
    >
      <span
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-md text-white',
          styles.chip,
        )}
      >
        <Icon size={15} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] font-medium text-foreground">{entry.label}</span>
        <span className="block truncate text-[10.5px] text-muted-foreground">
          {entry.description}
        </span>
      </span>
    </button>
  );
}

/**
 * Left palette of draggable node types (B-03). Fixed 224px column; drag a card
 * onto the canvas to create a node at the drop position.
 */
export function NodeToolbar() {
  const groups = (['flow', 'channel', 'logic'] as const).map((group) => ({
    group,
    entries: NODE_CATALOG.filter((entry) => entry.group === group),
  }));

  return (
    <aside className="flex w-[224px] flex-shrink-0 flex-col border-r border-border bg-card">
      <div className="px-4 pb-2 pt-4">
        <div className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
          Composants
        </div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">Glisser sur le canevas</div>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        {groups.map(({ group, entries }) => (
          <div key={group}>
            <div className="px-1 pb-1.5 text-[10.5px] font-medium text-muted-foreground">
              {NODE_GROUP_LABELS[group]}
            </div>
            <div className="flex flex-col gap-1.5">
              {entries.map((entry) => (
                <PaletteCard key={entry.type} entry={entry} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
