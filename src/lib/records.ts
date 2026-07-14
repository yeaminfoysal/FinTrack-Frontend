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
