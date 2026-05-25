import { AlertCircle, AlertTriangle, Check, type LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface SaveButtonProps {
  /** Whether the editor state diverges from the last saved snapshot. */
  isDirty: boolean;
  /** Count of critical (blocking) validation errors. */
  errorCount: number;
  /** Count of advisory validation warnings. */
  warningCount: number;
  onClick: () => void;
}

/** A coloured save-state pill anchored to the button's top-right corner. */
function SavePill({
  testId,
  color,
  icon: Icon,
}: {
  testId: string;
  color: string;
  icon: LucideIcon;
}) {
  return (
    <span
      data-testid={testId}
      aria-hidden
      className={cn(
        'pointer-events-none absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-white shadow-sm ring-2 ring-white',
        color,
      )}
    >
      <Icon className="h-3 w-3" />
    </span>
  );
}

/**
 * The editor's "Enregistrer" button with a save-state indicator (I-07 batch 1):
 *
 * - nothing to save (clean, no issues) → disabled, "no changes" tooltip;
 * - dirty + critical errors → red pill (the page still gates the actual save
 *   behind the I-06 force-save dialog);
 * - dirty + warnings only → amber pill;
 * - dirty + no issues → green pill.
 *
 * The pill is purely presentational and never blocks the click (pointer-events
 * are disabled on it).
 */
export function SaveButton({ isDirty, errorCount, warningCount, onClick }: SaveButtonProps) {
  const disabled = !isDirty && errorCount === 0 && warningCount === 0;

  let pill = null;
  if (isDirty) {
    if (errorCount > 0) {
      pill = <SavePill testId="save-pill-error" color="bg-red-500" icon={AlertCircle} />;
    } else if (warningCount > 0) {
      pill = <SavePill testId="save-pill-warning" color="bg-amber-500" icon={AlertTriangle} />;
    } else {
      pill = <SavePill testId="save-pill-clean" color="bg-emerald-500" icon={Check} />;
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {/* The wrapper still receives hover events when the button is disabled,
              so the "nothing to save" tooltip stays reachable. */}
          <span className="relative inline-flex">
            <Button size="sm" disabled={disabled} onClick={onClick}>
              Enregistrer
            </Button>
            {pill}
          </span>
        </TooltipTrigger>
        {disabled && <TooltipContent>Aucune modification à enregistrer</TooltipContent>}
      </Tooltip>
    </TooltipProvider>
  );
}
