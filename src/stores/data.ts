/**
 * Central offline-first data store. Zustand arrays are the reactive source the
 * UI reads; every write is mirrored to SQLite (source of truth) as PENDING.
 * If SQLite is unavailable the store still runs on an in-memory seed.
 */
import { create } from 'zustand';

import { computeDashboard, type DashboardSnapshot } from '@/lib/calc';
import { currentMonthKey, type MonthKey } from '@/lib/date';
import { getDb } from '@/lib/db';
import {
  clearAllData,
  getExpenses,
  getIncomes,
  getLoans,
  getMeta,
  getPracticals,
  getSummaries,
  setMeta,
  upsertExpense,
  upsertIncome,
  upsertLoan,
  upsertPractical,
  upsertSummary,
} from '@/lib/db/repo';
import { buildSeed } from '@/lib/db/seed';
import { newBase, nowIso } from '@/lib/records';
import type {
  Expense,
  Income,
  Loan,
  LoanDirection,
  MonthlySummary,
  PracticalBalance,
  UserProfile,
} from '@/lib/types';

const DEFAULT_PROFILE: UserProfile = {
  name: 'ব্যবহারকারী',
  email: '',
  openingSavings: 0,
  currency: 'BDT',
  timezone: 'Asia/Dhaka',
};

export interface AddIncomeInput {
  amount: number;
  source: string;
  date?: string;
  note?: string | null;
}
export interface AddExpenseInput {
  amount: number;
  category: string;
  date?: string;
  description?: string | null;
}
export interface AddLoanInput {
  direction: LoanDirection;
  personName: string;
  amount: number;
  date?: string;
  note?: string | null;
}

const DEMO_OWNER = '__demo__';

interface DataState {
  ready: boolean;
  ownerEmail: string | null;
  monthKey: MonthKey;
  incomes: Income[];
  expenses: Expense[];
  loans: Loan[];
  summaries: MonthlySummary[];
  practicals: Record<string, PracticalBalance>;
  profile: UserProfile;

  init: () => void;
  /** Seed the demo dataset (only for "continue as demo"). */
  seedDemo: () => void;
  /** Point local storage at a real account; wipes data if the owner changed. */
  prepareForUser: (email: string, patch?: Partial<UserProfile>) => void;
  setMonthKey: (key: MonthKey) => void;

  addIncome: (input: AddIncomeInput) => void;
  updateIncome: (id: string, patch: Partial<AddIncomeInput>) => void;
  deleteIncome: (id: string) => void;

  addExpense: (input: AddExpenseInput) => void;
  updateExpense: (id: string, patch: Partial<AddExpenseInput>) => void;
  deleteExpense: (id: string) => void;

  addLoan: (input: AddLoanInput) => void;
  settleLoan: (id: string, settledDate?: string) => void;
  deleteLoan: (id: string) => void;

  setPractical: (monthKey: MonthKey, parts: { cash: number; bank: number; mfs: number }) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;

  dashboard: (monthKey?: MonthKey) => DashboardSnapshot;
}

/** Run a DB mutation if SQLite is available; swallow errors (memory stays truth). */
function withDb(fn: (db: NonNullable<ReturnType<typeof getDb>>) => void): void {
  const db = getDb();
  if (!db) return;
  try {
    fn(db);
  } catch (e) {
    console.warn('[data] db write failed:', e);
  }
}

export const useDataStore = create<DataState>((set, get) => ({
  ready: false,
  ownerEmail: null,
  monthKey: currentMonthKey(),
  incomes: [],
  expenses: [],
  loans: [],
  summaries: [],
  practicals: {},
  profile: DEFAULT_PROFILE,

  // Load whatever is already stored for this device/account. Never auto-seeds:
  // a real (non-demo) account starts empty and fills via its own entries/sync.
  init: () => {
    if (get().ready) return;
    const db = getDb();

    if (db) {
      const practicals = getPracticals(db).reduce<Record<string, PracticalBalance>>((acc, p) => {
        acc[p.monthKey] = p;
        return acc;
      }, {});
      const profileRaw = getMeta(db, 'profile');
      set({
        ready: true,
        ownerEmail: getMeta(db, 'ownerEmail'),
        incomes: getIncomes(db),
        expenses: getExpenses(db),
        loans: getLoans(db),
        summaries: getSummaries(db),
        practicals,
        profile: profileRaw ? (JSON.parse(profileRaw) as UserProfile) : DEFAULT_PROFILE,
      });
      return;
    }

    // No SQLite (web): hydrate from the localStorage snapshot if one exists.
    const saved = loadWebSnapshot();
    set(saved ? { ready: true, ...saved } : { ready: true });
  },

  seedDemo: () => {
    const seed = buildSeed();
    withDb((db) => {
      clearAllData(db);
      seed.incomes.forEach((r) => upsertIncome(db, r));
      seed.expenses.forEach((r) => upsertExpense(db, r));
      seed.loans.forEach((r) => upsertLoan(db, r));
      seed.summaries.forEach((r) => upsertSummary(db, r));
      seed.practicals.forEach((r) => upsertPractical(db, r));
      setMeta(db, 'profile', JSON.stringify(seed.profile));
      setMeta(db, 'ownerEmail', DEMO_OWNER);
    });
    set({
      ready: true,
      ownerEmail: DEMO_OWNER,
      incomes: seed.incomes,
      expenses: seed.expenses,
      loans: seed.loans,
      summaries: seed.summaries,
      practicals: seed.practicals.reduce<Record<string, PracticalBalance>>((acc, p) => {
        acc[p.monthKey] = p;
        return acc;
      }, {}),
      profile: seed.profile,
    });
  },

  prepareForUser: (email, patch) => {
    // Same account already owns the local data → keep it, just apply any patch.
    if (get().ownerEmail === email) {
      if (patch) get().updateProfile(patch);
      return;
    }
    // Different owner (or leftover demo data) → wipe and start fresh.
    const nextProfile: UserProfile = { ...DEFAULT_PROFILE, email, ...patch };
    withDb((db) => {
      clearAllData(db);
      setMeta(db, 'profile', JSON.stringify(nextProfile));
      setMeta(db, 'ownerEmail', email);
    });
    set({
      ready: true,
      ownerEmail: email,
      incomes: [],
      expenses: [],
      loans: [],
      summaries: [],
      practicals: {},
      profile: nextProfile,
    });
  },

  setMonthKey: (key) => set({ monthKey: key }),

  addIncome: (input) => {
    const rec: Income = {
      ...newBase(),
      amount: input.amount,
      source: input.source,
      date: input.date ?? nowIso(),
      note: input.note ?? null,
    };
    set((s) => ({ incomes: [rec, ...s.incomes] }));
    withDb((db) => upsertIncome(db, rec));
  },
  updateIncome: (id, patch) => {
    let updated: Income | undefined;
    set((s) => ({
      incomes: s.incomes.map((i) => {
        if (i.id !== id) return i;
        updated = { ...i, ...patch, updatedAt: nowIso(), syncStatus: 'PENDING' };
        return updated;
      }),
    }));
    if (updated) withDb((db) => upsertIncome(db, updated!));
  },
  deleteIncome: (id) => {
    let removed: Income | undefined;
    set((s) => ({
      incomes: s.incomes.map((i) => {
        if (i.id !== id) return i;
        removed = { ...i, isDeleted: true, deletedAt: nowIso(), updatedAt: nowIso(), syncStatus: 'PENDING' };
        return removed;
      }),
    }));
    if (removed) withDb((db) => upsertIncome(db, removed!));
  },

  addExpense: (input) => {
    const rec: Expense = {
      ...newBase(),
      amount: input.amount,
      category: input.category,
      date: input.date ?? nowIso(),
      description: input.description ?? null,
    };
    set((s) => ({ expenses: [rec, ...s.expenses] }));
    withDb((db) => upsertExpense(db, rec));
  },
  updateExpense: (id, patch) => {
    let updated: Expense | undefined;
    set((s) => ({
      expenses: s.expenses.map((e) => {
        if (e.id !== id) return e;
        updated = { ...e, ...patch, updatedAt: nowIso(), syncStatus: 'PENDING' };
        return updated;
      }),
    }));
    if (updated) withDb((db) => upsertExpense(db, updated!));
  },
  deleteExpense: (id) => {
    let removed: Expense | undefined;
    set((s) => ({
      expenses: s.expenses.map((e) => {
        if (e.id !== id) return e;
        removed = { ...e, isDeleted: true, deletedAt: nowIso(), updatedAt: nowIso(), syncStatus: 'PENDING' };
        return removed;
      }),
    }));
    if (removed) withDb((db) => upsertExpense(db, removed!));
  },

  addLoan: (input) => {
    const rec: Loan = {
      ...newBase(),
      direction: input.direction,
      personName: input.personName,
      amount: input.amount,
      date: input.date ?? nowIso(),
      note: input.note ?? null,
      status: 'ACTIVE',
      settledDate: null,
    };
    set((s) => ({ loans: [rec, ...s.loans] }));
    withDb((db) => upsertLoan(db, rec));
  },
  settleLoan: (id, settledDate) => {
    let updated: Loan | undefined;
    set((s) => ({
      loans: s.loans.map((l) => {
        if (l.id !== id) return l;
        updated = {
          ...l,
          status: 'SETTLED',
          settledDate: settledDate ?? nowIso(),
          updatedAt: nowIso(),
          syncStatus: 'PENDING',
        };
        return updated;
      }),
    }));
    if (updated) withDb((db) => upsertLoan(db, updated!));
  },
  deleteLoan: (id) => {
    let removed: Loan | undefined;
    set((s) => ({
      loans: s.loans.map((l) => {
        if (l.id !== id) return l;
        removed = { ...l, isDeleted: true, deletedAt: nowIso(), updatedAt: nowIso(), syncStatus: 'PENDING' };
        return removed;
      }),
    }));
    if (removed) withDb((db) => upsertLoan(db, removed!));
  },

  setPractical: (monthKey, parts) => {
    const rec: PracticalBalance = {
      monthKey,
      cash: parts.cash,
      bank: parts.bank,
      mfs: parts.mfs,
      amount: parts.cash + parts.bank + parts.mfs,
      updatedAt: nowIso(),
    };
    set((s) => ({ practicals: { ...s.practicals, [monthKey]: rec } }));
    withDb((db) => upsertPractical(db, rec));
  },

  updateProfile: (patch) => {
    const next = { ...get().profile, ...patch };
    set({ profile: next });
    withDb((db) => setMeta(db, 'profile', JSON.stringify(next)));
  },

  dashboard: (monthKey) => {
    const s = get();
    const key = monthKey ?? s.monthKey;
    return computeDashboard({
      monthKey: key,
      incomes: s.incomes,
      expenses: s.expenses,
      loans: s.loans,
      summaries: s.summaries,
      baseOpening: s.profile.openingSavings,
      practical: s.practicals[key]?.amount ?? null,
    });
  },
}));

// ---------------------------------------------------------------------------
// Web persistence fallback. On web there is no SQLite (see src/lib/db/
// index.web.ts), so without this every refresh would lose all data. We mirror
// the data slice of the store into localStorage and hydrate it back in init().
// On native `localStorage` doesn't exist, so none of this attaches.
// ---------------------------------------------------------------------------

const WEB_SNAPSHOT_KEY = 'fintrack_data_v1';

type WebSnapshot = Pick<
  DataState,
  'ownerEmail' | 'incomes' | 'expenses' | 'loans' | 'summaries' | 'practicals' | 'profile'
>;

function loadWebSnapshot(): WebSnapshot | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(WEB_SNAPSHOT_KEY);
    return raw ? (JSON.parse(raw) as WebSnapshot) : null;
  } catch {
    return null;
  }
}

if (typeof localStorage !== 'undefined') {
  useDataStore.subscribe((s) => {
    // Only mirror when SQLite is absent (web) and the store has hydrated,
    // so we never overwrite a saved snapshot with the initial empty state.
    if (!s.ready || getDb()) return;
    const snapshot: WebSnapshot = {
      ownerEmail: s.ownerEmail,
      incomes: s.incomes,
      expenses: s.expenses,
      loans: s.loans,
      summaries: s.summaries,
      practicals: s.practicals,
      profile: s.profile,
    };
    try {
      localStorage.setItem(WEB_SNAPSHOT_KEY, JSON.stringify(snapshot));
    } catch {
      // storage full/blocked — in-memory state still works for the session
    }
  });
}
