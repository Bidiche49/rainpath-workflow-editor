import { toast } from 'sonner';

import { ApiError } from './client';

/**
 * Surfaces any thrown value as a toast. {@link ApiError} carries a meaningful
 * backend message; anything else (network failure, unexpected throw) falls
 * back to a generic message.
 */
export function notifyApiError(error: unknown): void {
  if (error instanceof ApiError) {
    toast.error(`Erreur : ${error.message}`);
    return;
  }
  toast.error('Erreur : une erreur inattendue est survenue');
}
