import type { ActionStatus } from '@rainpath/schemas';

import type { LogStatus } from './design-tokens';

/**
 * Mappe le statut persisté (ActionStatusSchema) vers le statut de présentation (LogStatus).
 * Note : le schéma actuel est plus pauvre que les états log design (pas de delivered/opened
 * distincts). À enrichir côté backend pour une UX de suivi granulaire. Documenté README §7.
 */
export function mapActionStatusToLogStatus(status: ActionStatus): LogStatus {
  switch (status) {
    case 'pending':
      return 'scheduled';
    case 'sent':
      return 'sent';
    case 'failed':
      return 'rejected';
    case 'skipped':
      return 'sent';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}
