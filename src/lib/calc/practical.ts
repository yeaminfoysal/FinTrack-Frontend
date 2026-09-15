/**
 * Keeps a counted practical balance in step with entries. Pure — no React, no DB.
 *
 * The user counts cash + bank + MFS at some moment. Money that moved before that
 * moment is already inside the counted amount; only later movements change what is
 * in hand now. So an entry adjusts a month's balance only for movements after the
 * count. A forgotten expense logged later with its real, earlier date leaves the
 * balance alone — which is what lets its untracked gap close.
 */
import { dayKeyOf, monthKeyOf, type MonthKey } from '@/lib/date';
import type { Expense, Income, Loan, PracticalBalance } from '@/lib/types';

/** One movement of money into or out of the user's hands. */
export interface CashEvent {
  /** When the money moved (the entry's date). */
  date: string;
  /** When it was written down; tells same-day movements before and after a count apart. */
  loggedAt: string;
  /** Signed paisa: + into hand, − out of hand. */
  delta: number;
}

export function incomeCashEvents(income: Income): CashEvent[] {
  return income.isDeleted ? [] : [{ date: income.date, loggedAt: income.createdAt, delta: income.amount }];
}

export function expenseCashEvents(expense: Expense): CashEvent[] {
  return expense.isDeleted ? [] : [{ date: expense.date, loggedAt: expense.createdAt, delta: -expense.amount }];
}

/** Lending takes cash out and its return brings it back; borrowing is the reverse. */
export function loanCashEvents(loan: Loan): CashEvent[] {
  if (loan.isDeleted) return [];
  const given: CashEvent = {
    date: loan.date,
    loggedAt: loan.createdAt,
    delta: loan.direction === 'LENT' ? -loan.amount : loan.amount,
  };
  if (loan.status === 'ACTIVE') return [given];
  // Settled without a date: nothing says when the money came back, so the loan nets to zero.
  if (!loan.settledDate) return [];
  return [given, { date: loan.settledDate, loggedAt: loan.settledDate, delta: -given.delta }];
}

/** Did the movement happen after the balance was counted — i.e. it isn't inside the count yet? */
export function isAfterCount(event: CashEvent, countedAt: string): boolean {
  const eventDay = dayKeyOf(event.date);
  const countDay = dayKeyOf(countedAt);
  if (eventDay !== countDay) return eventDay > countDay;
  // Entries carry a day, not a time. On the count's own day, one written down after the count is taken as after it.
  return Date.parse(event.loggedAt) > Date.parse(countedAt);
}

/**
 * The practical balances that change when an entry's cash movements go from `before`
 * to `after` ([] for an entry that doesn't exist yet or is deleted): old movements are
 * undone and new ones applied in the month each happened, except those already inside
 * that month's count. Returns only changed balances, marked for upload — an edit that
 * keeps the money the same returns none.
 */
export function adjustPracticals(
  practicals: Record<MonthKey, PracticalBalance>,
  before: CashEvent[],
  after: CashEvent[],
  now: string,
): PracticalBalance[] {
  const deltas = new Map<MonthKey, number>();
  const apply = (event: CashEvent, sign: 1 | -1) => {
    const key = monthKeyOf(new Date(event.date));
    const balance = practicals[key];
    if (!balance || !isAfterCount(event, balance.countedAt)) return;
    deltas.set(key, (deltas.get(key) ?? 0) + sign * event.delta);
  };
  before.forEach((event) => apply(event, -1));
  after.forEach((event) => apply(event, 1));

  const changed: PracticalBalance[] = [];
  for (const [key, delta] of deltas) {
    if (delta === 0) continue;
    const balance = practicals[key];
    // Entries don't record which wallet paid, so adjustments land on cash.
    changed.push({
      ...balance,
      cash: balance.cash + delta,
      amount: balance.amount + delta,
      updatedAt: now,
      syncStatus: 'PENDING',
    });
  }
  return changed;
}
