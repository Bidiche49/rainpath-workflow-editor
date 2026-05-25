import { useEffect, useState } from 'react';

import { useBlocker } from 'react-router-dom';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

export interface UnsavedChangesGuardProps {
  /** Whether the editor has unsaved changes. */
  isDirty: boolean;
  /** Persists the workflow. Resolves `true` on success, `false` otherwise. */
  onSave: () => Promise<boolean>;
}

/**
 * Blocks in-app navigation (React Router) while the editor holds unsaved
 * changes (I-07 batch 1). On a blocked transition the user can save and leave,
 * leave without saving, or cancel.
 *
 * `useBlocker` requires a data router, so the editor page mounts this component
 * only when one is present (it falls back to no guard under a plain router,
 * e.g. in component tests). The browser-close case is handled separately by
 * `useBeforeUnload`.
 */
export function UnsavedChangesGuard({ isDirty, onSave }: UnsavedChangesGuardProps) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname,
  );
  const [saving, setSaving] = useState(false);

  // If the editor becomes clean while a transition is held (e.g. saved through
  // another path), release the block so navigation resumes.
  useEffect(() => {
    if (blocker.state === 'blocked' && !isDirty) blocker.proceed();
  }, [blocker, isDirty]);

  if (blocker.state !== 'blocked') return null;

  const handleSaveAndLeave = async () => {
    setSaving(true);
    const ok = await onSave();
    setSaving(false);
    if (ok) blocker.proceed();
    else blocker.reset();
  };

  return (
    <AlertDialog open onOpenChange={(open) => !open && blocker.reset()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Modifications non enregistrées</AlertDialogTitle>
          <AlertDialogDescription>
            Vos modifications ne sont pas encore enregistrées. Voulez-vous les enregistrer avant de
            quitter cette page ?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="ghost" onClick={() => blocker.reset()}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={() => blocker.proceed()}>
            Quitter sans enregistrer
          </Button>
          <Button onClick={handleSaveAndLeave} disabled={saving}>
            Enregistrer puis quitter
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
