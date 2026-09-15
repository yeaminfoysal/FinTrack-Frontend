import { uuidv4 } from '@/lib/uuid';
import type { SyncStatus } from '@/lib/types';

export function nowIso(): string {
  return new Date().toISOString();
}

/** Common fields for a freshly-created record (offline-first → PENDING). */
export function newBase(): {
  id: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  deletedAt: string | null;
  syncStatus: SyncStatus;
} {
  const now = nowIso();
  return {
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
    deletedAt: null,
    syncStatus: 'PENDING',
  };
}

/**
 * Last-Write-Wins for a pull: the server copy replaces the local record unless the
 * local one holds a change not sent yet that is at least as new — that one stays and
 * wins on the server with the next push.
 */
export function shouldApplyIncoming(
  local: { syncStatus: SyncStatus; updatedAt: string } | null | undefined,
  incoming: { updatedAt: string },
): boolean {
  if (!local || local.syncStatus === 'SYNCED') return true;
  return Date.parse(incoming.updatedAt) > Date.parse(local.updatedAt);
}
