/**
 * Web persistence fallback. Web has no SQLite (src/lib/db/index.web.ts), so without this
 * every refresh would lose all data: the data part of the store is mirrored into
 * localStorage and hydrated back in init(). On native `localStorage` doesn't exist and
 * nothing attaches.
 */
import type { StoreApi } from 'zustand';

import type { DataFields, DataState } from '@/features/data-state';
import { getDb } from '@/lib/db';
import { toPractical } from '@/lib/db/repo';

const WEB_SNAPSHOT_KEY = 'fintrack_data_v1';

type WebSnapshot = Omit<DataFields, 'ready' | 'monthKey'>;

export function loadWebSnapshot(): Partial<WebSnapshot> | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(WEB_SNAPSHOT_KEY);
    if (!raw) return null;
    const snapshot = JSON.parse(raw) as Partial<WebSnapshot>;
    // Snapshots saved before practical balances had countedAt and syncStatus.
    if (snapshot.practicals) {
      snapshot.practicals = Object.fromEntries(
        Object.entries(snapshot.practicals).map(([key, p]) => [key, toPractical({ ...p })]),
      );
    }
    return snapshot;
  } catch {
    return null;
  }
}

export function saveWebSnapshots(store: StoreApi<DataState>): void {
  if (typeof localStorage === 'undefined') return;
  store.subscribe((s) => {
    // Only mirror when SQLite is absent (web) and the store has hydrated,
    // so we never overwrite a saved snapshot with the initial empty state.
    if (!s.ready || getDb()) return;
    const snapshot: WebSnapshot = {
      ownerEmail: s.ownerEmail,
      incomes: s.incomes,
      expenses: s.expenses,
      loans: s.loans,
      categories: s.categories,
      summaries: s.summaries,
      practicals: s.practicals,
      profile: s.profile,
      profileDirty: s.profileDirty,
      lastExpenseCategory: s.lastExpenseCategory,
      lastIncomeSource: s.lastIncomeSource,
    };
    try {
      localStorage.setItem(WEB_SNAPSHOT_KEY, JSON.stringify(snapshot));
    } catch {
      // storage full/blocked — in-memory state still works for the session
    }
  });
}
