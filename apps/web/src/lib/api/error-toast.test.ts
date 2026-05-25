import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from './client';
import { notifyApiError } from './error-toast';

const toastError = vi.fn();
vi.mock('sonner', () => ({ toast: { error: (...args: unknown[]) => toastError(...args) } }));

afterEach(() => {
  toastError.mockClear();
});

describe('notifyApiError', () => {
  it('surfaces the backend message carried by an ApiError', () => {
    notifyApiError(new ApiError(400, 'Validation failed'));
    expect(toastError).toHaveBeenCalledWith('Erreur : Validation failed');
  });

  it('falls back to a generic message for any non-ApiError throw', () => {
    notifyApiError(new TypeError('Failed to fetch'));
    expect(toastError).toHaveBeenCalledWith('Erreur : une erreur inattendue est survenue');
  });
});
