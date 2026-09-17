/**
 * When a loan is expected back, as the UI and the reminders both need it.
 * Pure — no React, no store.
 */
import { dayKeyOf, daysBetween, dayMonthBn, dayKeyToIso, todayKey, type DayKey } from '@/lib/date';
import { localDigits } from '@/lib/digits';
import type { Loan } from '@/lib/types';

export interface LoanDue {
  day: DayKey;
  /** Days from today until then — 0 is today, negative means the day has passed. */
  daysLeft: number;
  /** Past its day and still not fully back. */
  overdue: boolean;
  /** Today or within the next week. */
  soon: boolean;
}

/** How a loan stands against its due date; null when it has none or is already settled. */
export function loanDue(loan: Loan, settled: boolean, today: DayKey = todayKey()): LoanDue | null {
  if (!loan.dueDate || settled) return null;
  const day = dayKeyOf(loan.dueDate);
  const daysLeft = daysBetween(today, day);
  return { day, daysLeft, overdue: daysLeft < 0, soon: daysLeft >= 0 && daysLeft <= 7 };
}

/** "৩ দিন দেরি" · "আজ ফেরতের দিন" · "৫ দিনে" · "12 অক্টোবর". */
export function dueLabelBn(due: LoanDue): string {
  if (due.daysLeft === 0) return 'আজ ফেরতের দিন';
  if (due.overdue) return `${localDigits(-due.daysLeft)} দিন দেরি`;
  if (due.soon) return `${localDigits(due.daysLeft)} দিনে ফেরত`;
  return `${dayMonthBn(dayKeyToIso(due.day))}-এ ফেরত`;
}
