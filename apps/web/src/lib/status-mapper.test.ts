import type { ActionStatus } from '@rainpath/schemas';
import { describe, expect, it } from 'vitest';

import { mapActionStatusToLogStatus } from './status-mapper';

describe('mapActionStatusToLogStatus', () => {
  it('maps every persisted ActionStatus to its presentation LogStatus', () => {
    expect(mapActionStatusToLogStatus('pending')).toBe('scheduled');
    expect(mapActionStatusToLogStatus('sent')).toBe('sent');
    expect(mapActionStatusToLogStatus('failed')).toBe('rejected');
    expect(mapActionStatusToLogStatus('skipped')).toBe('sent');
  });

  it('returns the input verbatim on the exhaustive fallback (unknown status)', () => {
    // Force an out-of-enum value to exercise the `never` default branch.
    const unknown = 'archived' as ActionStatus;
    expect(mapActionStatusToLogStatus(unknown)).toBe('archived');
  });
});
