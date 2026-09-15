import { describe, expect, it } from '@jest/globals';

import { shouldApplyIncoming } from '@/lib/records';

describe('shouldApplyIncoming (pull merge)', () => {
  const incoming = { updatedAt: '2026-09-15T10:00:00.000Z' };

  it('takes the server copy for new or already-synced records', () => {
    expect(shouldApplyIncoming(null, incoming)).toBe(true);
    expect(shouldApplyIncoming({ syncStatus: 'SYNCED', updatedAt: '2026-09-15T11:00:00.000Z' }, incoming)).toBe(true);
  });

  it('keeps an unsent local change unless the server copy is newer', () => {
    expect(shouldApplyIncoming({ syncStatus: 'PENDING', updatedAt: '2026-09-15T11:00:00.000Z' }, incoming)).toBe(false);
    expect(shouldApplyIncoming({ syncStatus: 'PENDING', updatedAt: '2026-09-15T10:00:00.000Z' }, incoming)).toBe(false);
    expect(shouldApplyIncoming({ syncStatus: 'PENDING', updatedAt: '2026-09-15T09:00:00.000Z' }, incoming)).toBe(true);
  });
});
