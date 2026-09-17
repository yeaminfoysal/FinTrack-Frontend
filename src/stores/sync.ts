/**
 * Sync with the backend (offline-first): push PENDING records, pull server changes
 * (Last-Write-Wins) and expose a status the UI can show — syncing, offline, error,
 * and when the last successful sync happened.
 */
import { isAxiosError } from 'axios';
import { create } from 'zustand';

import { SyncApi, UsersApi, type OutgoingRecord } from '@/lib/api/endpoints';
import { getDb } from '@/lib/db';
import {
  getMeta,
  getPendingRecords,
  getPracticalVersion,
  getRecordVersion,
  getSummaryVersion,
  markAsSynced,
  setMeta,
  toCategory,
  toExpense,
  toIncome,
  toLoan,
  toLoanPayment,
  toPractical,
  toRecurring,
  toSummary,
  upsertCategory,
  upsertExpense,
  upsertIncome,
  upsertLoan,
  upsertLoanPayment,
  upsertPractical,
  upsertRecurring,
  upsertSummary,
} from '@/lib/db/repo';
import { shouldApplyIncoming } from '@/lib/records';
import type { MonthlySummary, PracticalBalance, SyncStatus } from '@/lib/types';
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

/**
 * Pull cursor: the server's clock at the last successful pull. The server filters on its
 * own write time, so device clocks never decide what is pulled. Only a pull may move it,
 * otherwise changes from other devices get skipped.
 */
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

type Versioned = { syncStatus: SyncStatus; updatedAt: string };

const byId = (row: { id: string }) => row.id;
const byMonthKey = (row: PracticalBalance) => row.monthKey;
const byYearMonth = (row: MonthlySummary) => `${row.year}-${row.month}`;
const newestDateFirst = (a: { date: string }, b: { date: string }) => b.date.localeCompare(a.date);
/** Repayments read as the order they were made in, like the repo's query. */
const oldestDateFirst = (a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date);
/** Categories keep the order they were added in — the order the chips show. */
const oldestCreatedFirst = (a: { createdAt: string }, b: { createdAt: string }) => a.createdAt.localeCompare(b.createdAt);
const newestMonthFirst = (a: MonthlySummary, b: MonthlySummary) => b.year * 100 + b.month - (a.year * 100 + a.month);
const practicalsByMonth = (rows: PracticalBalance[]) => Object.fromEntries(rows.map((p) => [p.monthKey, p]));

/** Drops syncStatus and null fields; the backend DTOs reject both. */
function toOutgoing<T extends object>(record: T): OutgoingRecord<T> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (key === 'syncStatus' || value === null || value === undefined) continue;
    clean[key] = value;
  }
  return clean as OutgoingRecord<T>;
}

/** Web fallback of the pull merge: server rows replace local ones by key, Last-Write-Wins. */
function mergeRows<T extends Versioned>(local: T[], incoming: T[], keyOf: (row: T) => string): T[] {
  const rows = new Map(local.map((row) => [keyOf(row), row]));
  for (const row of incoming) {
    if (shouldApplyIncoming(rows.get(keyOf(row)), row)) rows.set(keyOf(row), { ...row, syncStatus: 'SYNCED' });
  }
  return [...rows.values()];
}

/** Web fallback of markAsSynced: only rows still at the version that was sent. */
function markSent<T extends Versioned>(rows: T[], sent: T[], keyOf: (row: T) => string): T[] {
  const sentAt = new Map(sent.map((row) => [keyOf(row), row.updatedAt]));
  return rows.map((row) => (sentAt.get(keyOf(row)) === row.updatedAt ? { ...row, syncStatus: 'SYNCED' } : row));
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
      // The row mappers give server rows the local shape (dropping userId, serverUpdatedAt).
      const incoming = {
        incomes: (response.incomes ?? []).map(toIncome),
        expenses: (response.expenses ?? []).map(toExpense),
        loans: (response.loans ?? []).map(toLoan),
        loanPayments: (response.loanPayments ?? []).map(toLoanPayment),
        categories: (response.categories ?? []).map(toCategory),
        recurrings: (response.recurrings ?? []).map(toRecurring),
        summaries: (response.monthlySummaries ?? []).map(toSummary),
        practicals: (response.practicalBalances ?? []).map(toPractical),
      };
      console.log('[sync] pull response:', {
        incomes: incoming.incomes.length,
        expenses: incoming.expenses.length,
        loans: incoming.loans.length,
        loanPayments: incoming.loanPayments.length,
        categories: incoming.categories.length,
        recurrings: incoming.recurrings.length,
        summaries: incoming.summaries.length,
        practicals: incoming.practicals.length,
        serverTime: response.serverTime,
      });

      // Last-Write-Wins: a server row replaces the local one unless that holds an unsent change at least as new.
      if (db) {
        db.withTransactionSync(() => {
          for (const r of incoming.incomes) {
            if (shouldApplyIncoming(getRecordVersion(db, 'income', r.id), r)) upsertIncome(db, { ...r, syncStatus: 'SYNCED' });
          }
          for (const r of incoming.expenses) {
            if (shouldApplyIncoming(getRecordVersion(db, 'expense', r.id), r)) upsertExpense(db, { ...r, syncStatus: 'SYNCED' });
          }
          for (const r of incoming.loans) {
            if (shouldApplyIncoming(getRecordVersion(db, 'loan', r.id), r)) upsertLoan(db, { ...r, syncStatus: 'SYNCED' });
          }
          for (const r of incoming.loanPayments) {
            if (shouldApplyIncoming(getRecordVersion(db, 'loan_payment', r.id), r))
              upsertLoanPayment(db, { ...r, syncStatus: 'SYNCED' });
          }
          for (const r of incoming.categories) {
            if (shouldApplyIncoming(getRecordVersion(db, 'category', r.id), r)) upsertCategory(db, { ...r, syncStatus: 'SYNCED' });
          }
          for (const r of incoming.recurrings) {
            if (shouldApplyIncoming(getRecordVersion(db, 'recurring', r.id), r))
              upsertRecurring(db, { ...r, syncStatus: 'SYNCED' });
          }
          for (const r of incoming.summaries) {
            if (shouldApplyIncoming(getSummaryVersion(db, r.year, r.month), r)) upsertSummary(db, { ...r, syncStatus: 'SYNCED' });
          }
          for (const r of incoming.practicals) {
            if (shouldApplyIncoming(getPracticalVersion(db, r.monthKey), r)) upsertPractical(db, { ...r, syncStatus: 'SYNCED' });
          }
        });
        useDataStore.getState().reloadFromDb();
      } else {
        // Web fallback: merge into Zustand state directly
        const s = useDataStore.getState();
        useDataStore.setState({
          incomes: mergeRows(s.incomes, incoming.incomes, byId).sort(newestDateFirst),
          expenses: mergeRows(s.expenses, incoming.expenses, byId).sort(newestDateFirst),
          loans: mergeRows(s.loans, incoming.loans, byId).sort(newestDateFirst),
          loanPayments: mergeRows(s.loanPayments, incoming.loanPayments, byId).sort(oldestDateFirst),
          categories: mergeRows(s.categories, incoming.categories, byId).sort(oldestCreatedFirst),
          recurrings: mergeRows(s.recurrings, incoming.recurrings, byId).sort(oldestCreatedFirst),
          summaries: mergeRows(s.summaries, incoming.summaries, byYearMonth).sort(newestMonthFirst),
          practicals: practicalsByMonth(mergeRows(Object.values(s.practicals), incoming.practicals, byMonthKey)),
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
    const isPending = (row: Versioned) => row.syncStatus === 'PENDING';
    const pending = db
      ? getPendingRecords(db)
      : {
          incomes: s.incomes.filter(isPending),
          expenses: s.expenses.filter(isPending),
          loans: s.loans.filter(isPending),
          loanPayments: s.loanPayments.filter(isPending),
          categories: s.categories.filter(isPending),
          recurrings: s.recurrings.filter(isPending),
          monthlySummaries: s.summaries.filter(isPending),
          practicalBalances: Object.values(s.practicals).filter(isPending),
        };

    if (Object.values(pending).every((rows) => rows.length === 0)) {
      return; // Nothing to push
    }

    pushQueued = false;
    set({ isSyncing: true, status: 'syncing' });
    try {
      console.log('[sync] push starting, pending:', {
        incomes: pending.incomes.length,
        expenses: pending.expenses.length,
        loans: pending.loans.length,
        loanPayments: pending.loanPayments.length,
        categories: pending.categories.length,
        recurrings: pending.recurrings.length,
        summaries: pending.monthlySummaries.length,
        practicals: pending.practicalBalances.length,
      });

      const response = await SyncApi.push({
        incomes: pending.incomes.map(toOutgoing),
        expenses: pending.expenses.map(toOutgoing),
        loans: pending.loans.map(toOutgoing),
        loanPayments: pending.loanPayments.map(toOutgoing),
        categories: pending.categories.map(toOutgoing),
        recurrings: pending.recurrings.map(toOutgoing),
        monthlySummaries: pending.monthlySummaries.map(toOutgoing),
        practicalBalances: pending.practicalBalances.map(toOutgoing),
      });
      console.log('[sync] push success:', response);

      // Rows edited while the push was in flight have a newer updatedAt and stay PENDING.
      if (db) {
        markAsSynced(db, {
          incomes: pending.incomes,
          expenses: pending.expenses,
          loans: pending.loans,
          loanPayments: pending.loanPayments,
          categories: pending.categories,
          recurrings: pending.recurrings,
          summaries: pending.monthlySummaries,
          practicals: pending.practicalBalances,
        });
        useDataStore.getState().reloadFromDb();
      } else {
        const latest = useDataStore.getState();
        useDataStore.setState({
          incomes: markSent(latest.incomes, pending.incomes, byId),
          expenses: markSent(latest.expenses, pending.expenses, byId),
          loans: markSent(latest.loans, pending.loans, byId),
          loanPayments: markSent(latest.loanPayments, pending.loanPayments, byId),
          categories: markSent(latest.categories, pending.categories, byId),
          recurrings: markSent(latest.recurrings, pending.recurrings, byId),
          summaries: markSent(latest.summaries, pending.monthlySummaries, byId),
          practicals: practicalsByMonth(markSent(Object.values(latest.practicals), pending.practicalBalances, byMonthKey)),
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
