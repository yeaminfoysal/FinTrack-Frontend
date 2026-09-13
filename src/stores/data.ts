/**
 * Central offline-first data store. Zustand arrays are the reactive source the
 * UI reads; every write is mirrored to SQLite (source of truth) as PENDING.
 * If SQLite is unavailable the store still runs on an in-memory seed.
 */
import { create } from 'zustand';

import { closedMonthChain, computeDashboard, type DashboardSnapshot, type MonthFigures } from '@/lib/calc';
import { currentMonthKey, monthKeyOf, parseMonthKey, type MonthKey } from '@/lib/date';
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

function autoAdjustPractical(s: DataState, dateIso: string, delta: number): Pick<DataState, 'practicals'> | null {
  if (delta === 0) return null;
  const key = monthKeyOf(new Date(dateIso));
  const p = s.practicals[key];
  if (!p) return null;
  const updated = {
    ...p,
    cash: p.cash + delta,
    amount: p.amount + delta,
    updatedAt: nowIso(),
  };
  withDb((db) => upsertPractical(db, updated));
  return { practicals: { ...s.practicals, [key]: updated } };
}

/**
 * Practical-balance adjustment for an edited entry. `oldDelta`/`newDelta` are the
 * signed cash effects before and after the edit; if the date moved to another
 * month, undo the effect in the old month and apply it in the new one.
 */
function adjustForEdit(
  s: DataState,
  oldIso: string,
  oldDelta: number,
  newIso: string,
  newDelta: number,
): Pick<DataState, 'practicals'> | null {
  if (monthKeyOf(new Date(oldIso)) === monthKeyOf(new Date(newIso))) {
    return autoAdjustPractical(s, newIso, newDelta - oldDelta);
  }
  const undone = autoAdjustPractical(s, oldIso, -oldDelta);
  return autoAdjustPractical(undone ? { ...s, ...undone } : s, newIso, newDelta) ?? undone;
}

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
  /** Reloads all data from SQLite into memory (used after a background sync pull) */
  reloadFromDb: () => void;
  /**
   * Month-close catch-up: (re)computes the summary of every month before the
   * running one and persists only the months whose figures changed.
   */
  closeMonths: () => void;
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

function withDb(fn: (db: NonNullable<ReturnType<typeof getDb>>) => void): void {
  const db = getDb();
  if (db) {
    try {
      fn(db);
    } catch (e) {
      console.warn('[data] db write failed:', e);
    }
  }
  
  // Trigger sync in background without circular dependency (works for both SQLite and Web)
  setTimeout(() => {
    try {
      const { useSyncStore } = require('@/stores/sync');
      useSyncStore.getState().push();
    } catch (err) {}
  }, 500);
}

const FIGURE_KEYS = [
  'openingBalance',
  'totalIncome',
  'totalDailyExpense',
  'outstandingLent',
  'outstandingBorrowed',
  'untrackedExpense',
  'monthlySaving',
  'closingBalance',
  'practicalBalance',
] as const;

function sameFigures(stored: MonthlySummary, figures: MonthFigures): boolean {
  return FIGURE_KEYS.every((k) => (stored[k] ?? null) === (figures[k] ?? null));
}

const monthIndex = (r: { year: number; month: number }) => r.year * 100 + r.month;

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

  reloadFromDb: () => {
    const db = getDb();
    if (!db) return;
    try {
      set({
        incomes: getIncomes(db),
        expenses: getExpenses(db),
        loans: getLoans(db),
        summaries: getSummaries(db),
        practicals: getPracticals(db).reduce<Record<string, PracticalBalance>>((acc, p) => {
          acc[p.monthKey] = p;
          return acc;
        }, {}),
      });
    } catch {
      // ignore
    }
  },

  closeMonths: () => {
    const s = get();
    // The demo ships a fixed closed-month history; recomputing would overwrite it.
    if (!s.ready || s.ownerEmail === DEMO_OWNER) return;

    const currentKey = currentMonthKey();
    // One stored row per month: a live row beats a tombstone, then the newest write wins.
    const stored = new Map<number, MonthlySummary>();
    for (const row of s.summaries) {
      const prev = stored.get(monthIndex(row));
      if (
        !prev ||
        (prev.isDeleted && !row.isDeleted) ||
        (prev.isDeleted === row.isDeleted && row.updatedAt > prev.updatedAt)
      ) {
        stored.set(monthIndex(row), row);
      }
    }

    const chain = closedMonthChain({
      currentKey,
      baseOpening: s.profile.openingSavings,
      incomes: s.incomes,
      expenses: s.expenses,
      loans: s.loans,
      summaries: s.summaries,
      practicalFor: (key) => {
        const local = s.practicals[key];
        if (local) return local.amount;
        // Another device may have closed this month with a practical balance this one never saw.
        const row = stored.get(monthIndex(parseMonthKey(key)));
        return row && !row.isDeleted ? row.practicalBalance : null;
      },
    });

    const changed: MonthlySummary[] = [];
    const closed = chain.map((figures) => {
      const prev = stored.get(monthIndex(figures));
      if (prev && !prev.isDeleted && sameFigures(prev, figures)) return prev;
      const rec: MonthlySummary = prev
        ? { ...prev, ...figures, isDeleted: false, deletedAt: null, updatedAt: nowIso(), syncStatus: 'PENDING' }
        : { ...newBase(), ...figures };
      changed.push(rec);
      return rec;
    });

    const monthMoved = s.monthKey < currentKey;
    if (changed.length === 0 && !monthMoved) return;

    const chainMonths = new Set(chain.map(monthIndex));
    const summaries = [...closed, ...s.summaries.filter((row) => !chainMonths.has(monthIndex(row)))].sort(
      (a, b) => monthIndex(b) - monthIndex(a),
    );
    set({ summaries, ...(monthMoved ? { monthKey: currentKey } : {}) });
    if (changed.length > 0) withDb((db) => changed.forEach((row) => upsertSummary(db, row)));
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
      setMeta(db, 'lastSyncTime', '');
    });
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('lastSyncTime');
    }
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
    set((s) => ({
      incomes: [rec, ...s.incomes],
      ...(autoAdjustPractical(s, rec.date, rec.amount) || {}),
    }));
    withDb((db) => upsertIncome(db, rec));
  },
  updateIncome: (id, patch) => {
    let updated: Income | undefined;
    let adj: any = {};
    set((s) => {
      const incomes = s.incomes.map((i) => {
        if (i.id !== id) return i;
        updated = { ...i, ...patch, updatedAt: nowIso(), syncStatus: 'PENDING' };
        adj = adjustForEdit(s, i.date, i.amount, updated.date, updated.amount) || {};
        return updated;
      });
      return { incomes, ...adj };
    });
    if (updated) withDb((db) => upsertIncome(db, updated!));
  },
  deleteIncome: (id) => {
    let removed: Income | undefined;
    let adj: any = {};
    set((s) => {
      const incomes = s.incomes.map((i) => {
        if (i.id !== id) return i;
        removed = { ...i, isDeleted: true, deletedAt: nowIso(), updatedAt: nowIso(), syncStatus: 'PENDING' };
        adj = autoAdjustPractical(s, removed.date, -removed.amount) || {};
        return removed;
      });
      return { incomes, ...adj };
    });
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
    set((s) => ({
      expenses: [rec, ...s.expenses],
      ...(autoAdjustPractical(s, rec.date, -rec.amount) || {}),
    }));
    withDb((db) => upsertExpense(db, rec));
  },
  updateExpense: (id, patch) => {
    let updated: Expense | undefined;
    let adj: any = {};
    set((s) => {
      const expenses = s.expenses.map((e) => {
        if (e.id !== id) return e;
        updated = { ...e, ...patch, updatedAt: nowIso(), syncStatus: 'PENDING' };
        adj = adjustForEdit(s, e.date, -e.amount, updated.date, -updated.amount) || {};
        return updated;
      });
      return { expenses, ...adj };
    });
    if (updated) withDb((db) => upsertExpense(db, updated!));
  },
  deleteExpense: (id) => {
    let removed: Expense | undefined;
    let adj: any = {};
    set((s) => {
      const expenses = s.expenses.map((e) => {
        if (e.id !== id) return e;
        removed = { ...e, isDeleted: true, deletedAt: nowIso(), updatedAt: nowIso(), syncStatus: 'PENDING' };
        adj = autoAdjustPractical(s, removed.date, removed.amount) || {};
        return removed;
      });
      return { expenses, ...adj };
    });
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
    set((s) => {
      const delta = rec.direction === 'LENT' ? -rec.amount : rec.amount;
      return {
        loans: [rec, ...s.loans],
        ...(autoAdjustPractical(s, rec.date, delta) || {}),
      };
    });
    withDb((db) => upsertLoan(db, rec));
  },
  settleLoan: (id, settledDate) => {
    let updated: Loan | undefined;
    let adj: any = {};
    set((s) => {
      const loans = s.loans.map((l) => {
        if (l.id !== id) return l;
        updated = {
          ...l,
          status: 'SETTLED',
          settledDate: settledDate ?? nowIso(),
          updatedAt: nowIso(),
          syncStatus: 'PENDING',
        };
        const delta = l.direction === 'LENT' ? l.amount : -l.amount;
        adj = autoAdjustPractical(s, updated.date, delta) || {};
        return updated;
      });
      return { loans, ...adj };
    });
    if (updated) withDb((db) => upsertLoan(db, updated!));
  },
  deleteLoan: (id) => {
    let removed: Loan | undefined;
    let adj: any = {};
    set((s) => {
      const loans = s.loans.map((l) => {
        if (l.id !== id) return l;
        removed = { ...l, isDeleted: true, deletedAt: nowIso(), updatedAt: nowIso(), syncStatus: 'PENDING' };
        let delta = 0;
        if (l.status === 'ACTIVE') {
          delta = l.direction === 'LENT' ? l.amount : -l.amount;
        }
        adj = autoAdjustPractical(s, removed.date, delta) || {};
        return removed;
      });
      return { loans, ...adj };
    });
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

// Month-close catch-up (Modification #8 & #11): re-run the closed-month chain
// whenever something it depends on changes — app open (ready), local writes,
// sync pulls, backdated edits, practical balance or opening savings. Months
// whose figures didn't change aren't rewritten, so this settles immediately.
useDataStore.subscribe((s, prev) => {
  if (
    s.ready !== prev.ready ||
    s.incomes !== prev.incomes ||
    s.expenses !== prev.expenses ||
    s.loans !== prev.loans ||
    s.practicals !== prev.practicals ||
    s.profile.openingSavings !== prev.profile.openingSavings
  ) {
    s.closeMonths();
  }
});

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
