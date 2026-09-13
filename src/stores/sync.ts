import { create } from 'zustand';

import { SyncApi, UsersApi } from '@/lib/api/endpoints';
import { getDb } from '@/lib/db';
import { getMeta, setMeta, getPendingRecords, markAsSynced, upsertIncome, upsertExpense, upsertLoan, upsertSummary } from '@/lib/db/repo';
import { useDataStore } from '@/stores/data';

interface SyncState {
  isSyncing: boolean;
  pull: () => Promise<void>;
  push: () => Promise<void>;
}

const META_SYNC_KEY = 'lastSyncTime';

export const useSyncStore = create<SyncState>((set, get) => ({
  isSyncing: false,

  pull: async () => {
    if (get().isSyncing) return;
    const db = getDb();

    try {
      set({ isSyncing: true });

      // Get lastSyncTime; use undefined (not '') so the API omits the param entirely
      let lastSyncTime: string | undefined;
      if (db) {
        const val = getMeta(db, META_SYNC_KEY);
        lastSyncTime = val || undefined;
      } else if (typeof localStorage !== 'undefined') {
        const val = localStorage.getItem(META_SYNC_KEY);
        lastSyncTime = val || undefined;
      }

      console.log('[sync] pull starting, since:', lastSyncTime ?? '(full pull)');
      const response = await SyncApi.pull(lastSyncTime);
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
        setMeta(db, META_SYNC_KEY, response.serverTime);
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
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(META_SYNC_KEY, response.serverTime);
        }
      }

      // Also sync user profile (openingSavings, currency, timezone) from backend.
      // This ensures cross-device consistency for profile fields that aren't in
      // the sync tables (income/expense/loan/summary).
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

      console.log('[sync] pull complete');
    } catch (err: any) {
      console.warn('Pull sync failed:', err?.response?.data ?? err?.message ?? err);
    } finally {
      set({ isSyncing: false });
    }
    // Writes made while the pull held the lock (e.g. month-close on app open) skipped their push.
    void get().push();
  },

  push: async () => {
    if (get().isSyncing) return;
    const db = getDb();

    try {
      set({ isSyncing: true });
      const s = useDataStore.getState();
      const pending = db ? getPendingRecords(db) : {
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

      console.log('[sync] push payload sample:', JSON.stringify(payload.incomes[0] ?? payload.expenses[0] ?? payload.loans[0] ?? '(empty)'));

      const response = await SyncApi.push(payload);
      console.log('[sync] push success:', response);

      const idsToMark = {
        incomes: new Set(pending.incomes.map(i => i.id)),
        expenses: new Set(pending.expenses.map(e => e.id)),
        loans: new Set(pending.loans.map(l => l.id)),
        summaries: new Set(pending.monthlySummaries.map(s => s.id)),
      };

      if (db) {
        markAsSynced(db, {
          incomes: Array.from(idsToMark.incomes),
          expenses: Array.from(idsToMark.expenses),
          loans: Array.from(idsToMark.loans),
          summaries: Array.from(idsToMark.summaries),
        });
        setMeta(db, META_SYNC_KEY, response.serverTime);
        useDataStore.getState().reloadFromDb();
      } else {
        const mark = (arr: any[], ids: Set<string>) =>
          arr.map((item) => (ids.has(item.id) ? { ...item, syncStatus: 'SYNCED' } : item));

        useDataStore.setState({
          incomes: mark(s.incomes, idsToMark.incomes),
          expenses: mark(s.expenses, idsToMark.expenses),
          loans: mark(s.loans, idsToMark.loans),
          summaries: mark(s.summaries, idsToMark.summaries),
        });
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(META_SYNC_KEY, response.serverTime);
        }
      }
    } catch (err: any) {
      console.warn('Push sync failed:', err?.response?.data ?? err?.message ?? err);
    } finally {
      set({ isSyncing: false });
    }
  },
}));
