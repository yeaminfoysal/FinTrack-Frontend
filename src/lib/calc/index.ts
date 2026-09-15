/**
 * ⭐ Pure calculation layer — canonical formulas §A–§F (identical to backend).
 * No React, no DB. Everything in integer paisa. Heavily unit-testable.
 */

import { byMonth, rowsInMonth } from '@/lib/calc/month-index';
import {
  dayKeyOf,
  monthKeyOf,
  monthRangeOfKey,
  nextMonthKey,
  parseMonthKey,
  prevMonthKey,
  type DayKey,
  type MonthKey,
} from '@/lib/date';
import type { Expense, Income, Loan, LoanDirection, MonthlySummary } from '@/lib/types';

function active<T extends { isDeleted: boolean }>(rows: T[]): T[] {
  return rows.filter((r) => !r.isDeleted);
}

/** Sum of ACTIVE (non-settled, non-deleted) loans for a direction — global running total. */
export function outstandingLoans(loans: Loan[], direction: LoanDirection): number {
  return active(loans)
    .filter((l) => l.direction === direction && l.status === 'ACTIVE')
    .reduce((sum, l) => sum + l.amount, 0);
}

/**
 * Outstanding total for a direction as it stood at `atIso`: loans dated before
 * that instant and not yet settled by then. Snapshots a closed month, so
 * settling a loan later doesn't rewrite that month's figures.
 */
export function outstandingLoansAt(loans: Loan[], direction: LoanDirection, atIso: string): number {
  const at = new Date(atIso).getTime();
  return active(loans)
    .filter((l) => l.direction === direction && new Date(l.date).getTime() < at)
    .filter((l) => l.status === 'ACTIVE' || (l.settledDate != null && new Date(l.settledDate).getTime() >= at))
    .reduce((sum, l) => sum + l.amount, 0);
}

/** Total income within the current-month scope. */
export function monthIncome(incomes: Income[], key: MonthKey): number {
  return rowsInMonth(incomes, key).reduce((sum, i) => sum + i.amount, 0);
}

/** Total daily expense within the current-month scope. */
export function monthDailyExpense(expenses: Expense[], key: MonthKey): number {
  return rowsInMonth(expenses, key).reduce((sum, e) => sum + e.amount, 0);
}

export interface DayExpenses {
  day: DayKey;
  total: number;
  items: Expense[];
}

/**
 * Daily expenses of a month grouped by local calendar day — newest day first,
 * newest entry first within a day. Day totals add up to monthDailyExpense().
 */
export function dailyExpenses(expenses: Expense[], key: MonthKey): DayExpenses[] {
  const byDay = new Map<DayKey, Expense[]>();
  for (const e of rowsInMonth(expenses, key)) {
    const day = dayKeyOf(e.date);
    const list = byDay.get(day);
    if (list) list.push(e);
    else byDay.set(day, [e]);
  }
  return [...byDay.entries()]
    .map(([day, items]) => ({
      day,
      total: items.reduce((sum, e) => sum + e.amount, 0),
      items: items.sort((a, b) =>
        a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date),
      ),
    }))
    .sort((a, b) => b.day.localeCompare(a.day));
}

export interface CategoryTotal {
  category: string;
  amount: number;
}

/** Daily expense of a month per category, largest first. The amounts add up to monthDailyExpense(). */
export function categoryTotals(expenses: Expense[], key: MonthKey): CategoryTotal[] {
  const totals = new Map<string, number>();
  for (const e of rowsInMonth(expenses, key)) {
    totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
  }
  return [...totals.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export interface TheoreticalInput {
  opening: number;
  monthIncome: number;
  outstandingBorrowed: number;
  monthDailyExpense: number;
  outstandingLent: number;
}

/**
 * §B — Theoretical Balance (dashboard "Current Balance").
 * Income & daily expense are current-month scope; lent/borrowed are global.
 */
export function theoreticalBalance(i: TheoreticalInput): number {
  return (
    i.opening + i.monthIncome + i.outstandingBorrowed - i.monthDailyExpense - i.outstandingLent
  );
}

/**
 * §C — Untracked Expense = Theoretical − Practical.
 * Practical null/undefined → 0. Sign is preserved; a negative value means the
 * user has MORE than expected ("Untracked Income" in the UI).
 */
export function untrackedExpense(theoretical: number, practical: number | null | undefined): number {
  if (practical == null) return 0;
  return theoretical - practical;
}

/**
 * §D — Monthly Saving = Income − (Daily Expense + Untracked).
 * Loans are NOT included (separate ledger). Equivalent to Practical − Opening.
 */
export function monthlySaving(income: number, dailyExpense: number, untracked: number): number {
  return income - (dailyExpense + untracked);
}

/** §E — Carry forward: next month opening = prev opening + prev saving. */
export function carryForwardOpening(prevOpening: number, prevSaving: number): number {
  return prevOpening + prevSaving;
}

/** §F — Total Expense = Daily + Outstanding Lent + Untracked (label caution). */
export function totalExpense(dailyExpense: number, outstandingLent: number, untracked: number): number {
  return dailyExpense + outstandingLent + untracked;
}

/**
 * Net Worth = Practical + Outstanding Lent − Outstanding Borrowed.
 * Without a practical input, pass Theoretical: untracked is 0 then, which
 * already assumes cash on hand = theoretical (never treat it as ৳0).
 */
export function netWorth(practical: number, outstandingLent: number, outstandingBorrowed: number): number {
  return practical + outstandingLent - outstandingBorrowed;
}

/**
 * Opening balance for an (open) month: the closing balance of the most recent
 * closed month before it, else the user's base opening savings.
 */
export function openingForMonth(
  summaries: MonthlySummary[],
  baseOpening: number,
  key: MonthKey,
): number {
  const prevKey = prevMonthKey(key);
  const prev = active(summaries).find(
    (s) => monthKeyOf(new Date(s.year, s.month - 1, 1)) === prevKey,
  );
  if (prev) return prev.closingBalance;

  // No immediately-previous summary: fall back to the latest earlier summary,
  // or the base opening savings if there is no history at all.
  const earlier = active(summaries)
    .filter((s) => monthKeyOf(new Date(s.year, s.month - 1, 1)) < key)
    .sort((a, b) =>
      monthKeyOf(new Date(a.year, a.month - 1, 1)) < monthKeyOf(new Date(b.year, b.month - 1, 1))
        ? 1
        : -1,
    );
  return earlier.length ? earlier[0].closingBalance : baseOpening;
}

/** The figures a closed month stores (a MonthlySummary without its record fields). */
export type MonthFigures = Pick<
  MonthlySummary,
  | 'year'
  | 'month'
  | 'openingBalance'
  | 'totalIncome'
  | 'totalDailyExpense'
  | 'outstandingLent'
  | 'outstandingBorrowed'
  | 'untrackedExpense'
  | 'monthlySaving'
  | 'closingBalance'
  | 'practicalBalance'
>;

export interface MonthChainInput {
  /** The running month; every month before it is closed. */
  currentKey: MonthKey;
  baseOpening: number;
  incomes: Income[];
  expenses: Expense[];
  loans: Loan[];
  /** Already-stored summaries; their months stay in the chain even without records. */
  summaries: MonthlySummary[];
  /** Practical balance recorded for a month, if any. */
  practicalFor: (key: MonthKey) => number | null;
}

/**
 * Month-close chain (§B–§E): figures for every closed month, oldest first,
 * from the first month with any record or stored summary up to the month
 * before `currentKey`. The first opening is `baseOpening` and every later
 * opening is the previous closing, so a backdated change flows into all later
 * months. Loans are the running totals as of each month's end. Idempotent.
 */
export function closedMonthChain(input: MonthChainInput): MonthFigures[] {
  const { currentKey, incomes, expenses, loans, summaries, practicalFor } = input;
  const keys = [
    ...byMonth(incomes).keys(),
    ...byMonth(expenses).keys(),
    ...byMonth(loans).keys(),
    ...active(summaries).map((s) => monthKeyOf(new Date(s.year, s.month - 1, 1))),
  ];
  if (keys.length === 0) return [];

  const chain: MonthFigures[] = [];
  let opening = input.baseOpening;
  for (let key = keys.reduce((a, b) => (a < b ? a : b)); key < currentKey; key = nextMonthKey(key)) {
    const { year, month } = parseMonthKey(key);
    const monthEnd = monthRangeOfKey(key).end;
    const mIncome = monthIncome(incomes, key);
    const mExpense = monthDailyExpense(expenses, key);
    const oLent = outstandingLoansAt(loans, 'LENT', monthEnd);
    const oBorrowed = outstandingLoansAt(loans, 'BORROWED', monthEnd);
    const practical = practicalFor(key);
    const theoretical = theoreticalBalance({
      opening,
      monthIncome: mIncome,
      outstandingBorrowed: oBorrowed,
      monthDailyExpense: mExpense,
      outstandingLent: oLent,
    });
    const untracked = untrackedExpense(theoretical, practical);
    const saving = monthlySaving(mIncome, mExpense, untracked);
    const closing = carryForwardOpening(opening, saving);
    chain.push({
      year,
      month,
      openingBalance: opening,
      totalIncome: mIncome,
      totalDailyExpense: mExpense,
      outstandingLent: oLent,
      outstandingBorrowed: oBorrowed,
      untrackedExpense: untracked,
      monthlySaving: saving,
      closingBalance: closing,
      practicalBalance: practical,
    });
    opening = closing;
  }
  return chain;
}

export interface DashboardSnapshot {
  monthKey: MonthKey;
  opening: number;
  monthIncome: number;
  monthDailyExpense: number;
  outstandingLent: number;
  outstandingBorrowed: number;
  theoretical: number;
  practical: number | null;
  untracked: number;
  saving: number;
  netWorth: number;
  totalExpense: number;
}

export interface DashboardInput {
  monthKey: MonthKey;
  incomes: Income[];
  expenses: Expense[];
  loans: Loan[];
  summaries: MonthlySummary[];
  baseOpening: number;
  practical: number | null;
}

/** One-shot dashboard computation from raw local records. */
export function computeDashboard(input: DashboardInput): DashboardSnapshot {
  const { monthKey, incomes, expenses, loans, summaries, baseOpening, practical } = input;

  // A closed month shows exactly what it stored, so its closing always equals the next opening.
  const { year, month } = parseMonthKey(monthKey);
  const closed = active(summaries).find((s) => s.year === year && s.month === month);
  if (closed) {
    const closedTheoretical = theoreticalBalance({
      opening: closed.openingBalance,
      monthIncome: closed.totalIncome,
      outstandingBorrowed: closed.outstandingBorrowed,
      monthDailyExpense: closed.totalDailyExpense,
      outstandingLent: closed.outstandingLent,
    });
    return {
      monthKey,
      opening: closed.openingBalance,
      monthIncome: closed.totalIncome,
      monthDailyExpense: closed.totalDailyExpense,
      outstandingLent: closed.outstandingLent,
      outstandingBorrowed: closed.outstandingBorrowed,
      theoretical: closedTheoretical,
      practical: closed.practicalBalance,
      untracked: closed.untrackedExpense,
      saving: closed.monthlySaving,
      netWorth: netWorth(closed.practicalBalance ?? closedTheoretical, closed.outstandingLent, closed.outstandingBorrowed),
      totalExpense: totalExpense(closed.totalDailyExpense, closed.outstandingLent, closed.untrackedExpense),
    };
  }

  const opening = openingForMonth(summaries, baseOpening, monthKey);
  const mIncome = monthIncome(incomes, monthKey);
  const mExpense = monthDailyExpense(expenses, monthKey);
  const oLent = outstandingLoans(loans, 'LENT');
  const oBorrowed = outstandingLoans(loans, 'BORROWED');
  const theoretical = theoreticalBalance({
    opening,
    monthIncome: mIncome,
    outstandingBorrowed: oBorrowed,
    monthDailyExpense: mExpense,
    outstandingLent: oLent,
  });
  const untracked = untrackedExpense(theoretical, practical);
  const saving = monthlySaving(mIncome, mExpense, untracked);
  return {
    monthKey,
    opening,
    monthIncome: mIncome,
    monthDailyExpense: mExpense,
    outstandingLent: oLent,
    outstandingBorrowed: oBorrowed,
    theoretical,
    practical: practical ?? null,
    untracked,
    saving,
    netWorth: netWorth(practical ?? theoretical, oLent, oBorrowed),
    totalExpense: totalExpense(mExpense, oLent, untracked),
  };
}
