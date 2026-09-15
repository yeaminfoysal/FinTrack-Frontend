/**
 * Sync with the backend (offline-first): push PENDING records, pull server changes
 * (Last-Write-Wins) and expose a status the UI can show — syncing, offline, error,
 * and when the last successful sync happened.
 */
import { isAxiosError } from 'axios';
import { create } from 'zustand';

import { SyncApi, UsersApi } from '@/lib/api/endpoints';
import { getDb } from '@/lib/db';
import {
  getMeta,
  getPendingRecords,
  markAsSynced,
  setMeta,
  upsertExpense,
  upsertIncome,
  upsertLoan,
  upsertSummary,
} from '@/lib/db/repo';
import { DEMO_OWNER, useDataStore } from '@/stores/data';

export type SyncPhase = 'idle' | 'syncing' | 'offline' | 'error';

interface SyncState {
  isSyncing: boolean;
  status: SyncPhase;
  /** Server time of the last successful push or pull, shown to the user. */
  lastSyncedAt: string | null;
  lastError: string | null;
  pull: () => Promise<void>;
  push: () => Promise<void>;
  /** Pull, then push — the "sync now" / pull-to-refresh action. */
  syncNow: () => Promise<void>;
}

/** Pull cursor. Only a successful pull may move it, otherwise changes from other devices get skipped. */
const PULL_CURSOR_KEY = 'lastSyncTime';
const LAST_SYNCED_KEY = 'lastSyncedAt';

function readValue(key: string): string | null {
  try {
    const db = getDb();
    if (db) return getMeta(db, key) || null;
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) || null : null;
  } catch {
    return null;
  }
}

function writeValue(key: string, value: string): void {
  try {
    const db = getDb();
    if (db) setMeta(db, key, value);
    else if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  } catch {
    // not fatal — the next successful sync writes it again
  }
}

const isDemo = () => useDataStore.getState().ownerEmail === DEMO_OWNER;

function failure(err: unknown): Pick<SyncState, 'status' | 'lastError'> {
  if (isAxiosError(err) && !err.response) return { status: 'offline', lastError: null };
  const message = isAxiosError(err)
    ? `HTTP ${err.response?.status ?? '?'}`
    : err instanceof Error
      ? err.message
      : String(err);
  return { status: 'error', lastError: message };
}

/** A push requested while another sync held the lock; it runs once that sync ends. */
let pushQueued = false;

/** Uploads a profile edited on this device (name, opening savings) before the server copy is pulled. */
async function pushProfileIfDirty(): Promise<void> {
  const { profileDirty, profile, markProfileSynced } = useDataStore.getState();
  if (!profileDirty) return;
  await UsersApi.updateName(profile.name);
  await UsersApi.updateSettings({ openingSavings: profile.openingSavings });
  markProfileSynced();
}

export const useSyncStore = create<SyncState>((set, get) => ({
  isSyncing: false,
  status: 'idle',
  lastSyncedAt: readValue(LAST_SYNCED_KEY),
  lastError: null,

  pull: async () => {
    // The demo dataset lives only on this device; its fake tokens would sign the user out.
    if (isDemo() || get().isSyncing) return;
    const db = getDb();
    set({ isSyncing: true, status: 'syncing' });

    try {
      await pushProfileIfDirty();

      // Use undefined (not '') so the API omits the param entirely
      const since = readValue(PULL_CURSOR_KEY) ?? undefined;
      console.log('[sync] pull starting, since:', since ?? '(full pull)');
      const response = await SyncApi.pull(since);
      console.log('[sync] pull response:', {
        incomes: response.incomes?.length ?? 0,
        expenses: response.expenses?.length ?? 0,
        loans: response.loans?.length ?? 0,
        summaries: response.monthlySummaries?.length ?? 0,
        serverTime: response.serverTime,
      });

      if (db) {
        db.withTransactionSync(() => {
          (response.incomes ?? []).forEach((i: any) => upsertIncome(db, { ...i, syncStatus: 'SYNCED' }));
          (response.expenses ?? []).forEach((e: any) => upsertExpense(db, { ...e, syncStatus: 'SYNCED' }));
          (response.loans ?? []).forEach((l: any) => upsertLoan(db, { ...l, syncStatus: 'SYNCED' }));
          (response.monthlySummaries ?? []).forEach((s: any) => upsertSummary(db, { ...s, syncStatus: 'SYNCED' }));
        });
        useDataStore.getState().reloadFromDb();
      } else {
        // Web fallback: merge into Zustand state directly
        const s = useDataStore.getState();
        const merge = (existing: any[], incoming: any[]) => {
          const map = new Map(existing.map((e) => [e.id, e]));
          (incoming ?? []).forEach((item) => map.set(item.id, { ...item, syncStatus: 'SYNCED' }));
          return Array.from(map.values()).sort((a: any, b: any) => (b.date ?? '').localeCompare(a.date ?? '') || 0);
        };
        useDataStore.setState({
          incomes: merge(s.incomes, response.incomes),
          expenses: merge(s.expenses, response.expenses),
          loans: merge(s.loans, response.loans),
          summaries: merge(s.summaries, response.monthlySummaries),
        });
      }
      writeValue(PULL_CURSOR_KEY, response.serverTime);

      // Profile fields (openingSavings, currency, timezone) aren't in the sync tables.
      // A profile edited here and not uploaded yet wins over the server copy.
      if (!useDataStore.getState().profileDirty) {
        try {
          const me = await UsersApi.me();
          if (me) {
            const profilePatch: Record<string, any> = {};
            if (me.openingSavings !== undefined) profilePatch.openingSavings = Number(me.openingSavings);
            if (me.currency) profilePatch.currency = me.currency;
            if (me.timezone) profilePatch.timezone = me.timezone;
            if (me.name) profilePatch.name = me.name;
            if (me.email) profilePatch.email = me.email;
            if (Object.keys(profilePatch).length > 0) {
              useDataStore.getState().updateProfile(profilePatch);
            }
          }
        } catch (profileErr: any) {
          console.warn('[sync] profile fetch failed (non-critical):', profileErr?.message);
        }
      }

      writeValue(LAST_SYNCED_KEY, response.serverTime);
      set({ status: 'idle', lastSyncedAt: response.serverTime, lastError: null });
      console.log('[sync] pull complete');
    } catch (err: any) {
      console.warn('Pull sync failed:', err?.response?.data ?? err?.message ?? err);
      set(failure(err));
    } finally {
      set({ isSyncing: false });
    }
    // Offline the push would fail the same way; the next sync retries it.
    if (get().status === 'offline') return;
    // Writes made while the pull held the lock (e.g. month-close on app open) skipped their push.
    await get().push();
  },

  push: async () => {
    if (isDemo()) return;
    if (get().isSyncing) {
      pushQueued = true;
      return;
    }
    const db = getDb();
    const s = useDataStore.getState();
    const pending = db
      ? getPendingRecords(db)
      : {
          incomes: s.incomes.filter((i) => i.syncStatus === 'PENDING'),
          expenses: s.expenses.filter((e) => e.syncStatus === 'PENDING'),
          loans: s.loans.filter((l) => l.syncStatus === 'PENDING'),
          monthlySummaries: s.summaries.filter((m) => m.syncStatus === 'PENDING'),
        };

    if (
      pending.incomes.length === 0 &&
      pending.expenses.length === 0 &&
      pending.loans.length === 0 &&
      pending.monthlySummaries.length === 0
    ) {
      return; // Nothing to push
    }

    pushQueued = false;
    set({ isSyncing: true, status: 'syncing' });
    try {
      console.log('[sync] push starting, pending:', {
        incomes: pending.incomes.length,
        expenses: pending.expenses.length,
        loans: pending.loans.length,
        summaries: pending.monthlySummaries.length,
      });

      /** Strip syncStatus and null values; backend rejects both. */
      const strip = (record: any) => {
        const clean: any = {};
        for (const [k, v] of Object.entries(record)) {
          if (k === 'syncStatus') continue;
          if (v === null || v === undefined) continue;
          clean[k] = v;
        }
        return clean;
      };

      const payload = {
        incomes: pending.incomes.map(strip),
        expenses: pending.expenses.map(strip),
        loans: pending.loans.map(strip),
        monthlySummaries: pending.monthlySummaries.map(strip),
      };

      const response = await SyncApi.push(payload);
      console.log('[sync] push success:', response);

      const idsToMark = {
        incomes: new Set(pending.incomes.map((i) => i.id)),
        expenses: new Set(pending.expenses.map((e) => e.id)),
        loans: new Set(pending.loans.map((l) => l.id)),
        summaries: new Set(pending.monthlySummaries.map((m) => m.id)),
      };

      if (db) {
        markAsSynced(db, {
          incomes: Array.from(idsToMark.incomes),
          expenses: Array.from(idsToMark.expenses),
          loans: Array.from(idsToMark.loans),
          summaries: Array.from(idsToMark.summaries),
        });
        useDataStore.getState().reloadFromDb();
      } else {
        const latest = useDataStore.getState();
        const mark = (arr: any[], ids: Set<string>) =>
          arr.map((item) => (ids.has(item.id) ? { ...item, syncStatus: 'SYNCED' } : item));

        useDataStore.setState({
          incomes: mark(latest.incomes, idsToMark.incomes),
          expenses: mark(latest.expenses, idsToMark.expenses),
          loans: mark(latest.loans, idsToMark.loans),
          summaries: mark(latest.summaries, idsToMark.summaries),
        });
      }

      writeValue(LAST_SYNCED_KEY, response.serverTime);
      set({ status: 'idle', lastSyncedAt: response.serverTime, lastError: null });
    } catch (err: any) {
      console.warn('Push sync failed:', err?.response?.data ?? err?.message ?? err);
      set(failure(err));
    } finally {
      set({ isSyncing: false });
    }
    if (pushQueued && get().status === 'idle') await get().push();
  },

  syncNow: async () => {
    await get().pull();
  },
}));
