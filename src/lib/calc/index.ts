/**
 * ⭐ Pure calculation layer — canonical formulas §A–§F (identical to backend).
 * No React, no DB. Everything in integer paisa. Heavily unit-testable.
 */

import { isInMonth, monthKeyOf, prevMonthKey, type MonthKey } from '@/lib/date';
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

/** Total income within the current-month scope. */
export function monthIncome(incomes: Income[], key: MonthKey): number {
  return active(incomes)
    .filter((i) => isInMonth(i.date, key))
    .reduce((sum, i) => sum + i.amount, 0);
}

/** Total daily expense within the current-month scope. */
export function monthDailyExpense(expenses: Expense[], key: MonthKey): number {
  return active(expenses)
    .filter((e) => isInMonth(e.date, key))
    .reduce((sum, e) => sum + e.amount, 0);
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

/** Net Worth = Practical + Outstanding Lent − Outstanding Borrowed. */
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
    netWorth: netWorth(practical ?? 0, oLent, oBorrowed),
    totalExpense: totalExpense(mExpense, oLent, untracked),
  };
}
