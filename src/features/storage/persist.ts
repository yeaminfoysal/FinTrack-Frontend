/** Writes from the data store to SQLite, and the sync they set off. */
import { getDb } from '@/lib/db';
import { setMeta } from '@/lib/db/repo';

export type Db = NonNullable<ReturnType<typeof getDb>>;

/**
 * Runs a record write on SQLite and schedules a push. Without SQLite (web) only the push
 * is scheduled — the web snapshot (web-snapshot.ts) keeps the data there.
 */
export function withDb(fn: (db: Db) => void): void {
  const db = getDb();
  if (db) {
    try {
      fn(db);
    } catch (e) {
      console.warn('[data] db write failed:', e);
    }
  }

  setTimeout(() => {
    try {
      syncStore().getState().push();
    } catch {
      // sync store unavailable — the next sync picks the change up
    }
  }, 500);
}

/** The sync store, loaded lazily: it imports the data store, so a static import would be circular. */
function syncStore(): (typeof import('@/stores/sync'))['useSyncStore'] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/stores/sync').useSyncStore;
}

/** Starts a full sync (pull + push) shortly. */
export function requestSync(): void {
  setTimeout(() => {
    try {
      void syncStore().getState().syncNow();
    } catch {
      // sync store unavailable — the next sync picks the change up
    }
  }, 300);
}

/** Meta write that isn't a record change (no push). */
export function writeMeta(key: string, value: string): void {
  const db = getDb();
  if (!db) return;
  try {
    setMeta(db, key, value);
  } catch (e) {
    console.warn('[data] meta write failed:', e);
  }
}
