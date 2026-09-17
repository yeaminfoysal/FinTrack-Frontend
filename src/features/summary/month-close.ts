/**
 * Month-close catch-up (Modification #8 & #11): the summary of every month before the
 * running one is (re)computed from the closed-month chain; only months whose figures
 * changed are saved and pushed.
 */
import type { StoreApi } from 'zustand';

import { DEMO_OWNER, type DataSlice, type DataState, type MonthCloseActions } from '@/features/data-state';
import { withDb } from '@/features/storage/persist';
import { closedMonthChain, type MonthFigures } from '@/lib/calc';
import { currentMonthKey, parseMonthKey } from '@/lib/date';
import { upsertSummary } from '@/lib/db/repo';
import { newBase, nowIso } from '@/lib/records';
import type { MonthlySummary } from '@/lib/types';

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

export const createMonthCloseSlice: DataSlice<MonthCloseActions> = (set, get) => ({
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
      payments: s.loanPayments,
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
});

/**
 * Re-runs the chain whenever something it depends on changes — app open (ready), local
 * writes, sync pulls, backdated edits, practical balance or opening savings. Months
 * whose figures didn't change aren't rewritten, so this settles immediately.
 */
export function closeMonthsOnChange(store: StoreApi<DataState>): void {
  store.subscribe((s, prev) => {
    if (
      s.ready !== prev.ready ||
      s.incomes !== prev.incomes ||
      s.expenses !== prev.expenses ||
      s.loans !== prev.loans ||
      s.loanPayments !== prev.loanPayments ||
      s.practicals !== prev.practicals ||
      s.profile.openingSavings !== prev.profile.openingSavings
    ) {
      s.closeMonths();
    }
  });
}
