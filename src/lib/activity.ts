/**
 * Incomes, expenses and loans as one timeline for the lists on Home and the লেনদেন tab:
 * display rows, grouping by day and search/filter. Pure — no React, no store.
 */
import type { IconName } from '@/components/ui/icon';
import { categorySet } from '@/constants/categories';
import { paidOnLoan } from '@/lib/calc';
import { rowsInMonth } from '@/lib/calc/month-index';
import {
  dayKeyOf,
  dayKeyToIso,
  dayMonthBn,
  fullDateBn,
  shiftDayKey,
  todayKey,
  weekdayBn,
  type DayKey,
  type MonthKey,
} from '@/lib/date';
import { toLatinDigits } from '@/lib/digits';
import { formatAmount, formatTaka } from '@/lib/money';
import type { Category, Expense, Income, Loan, LoanPayment } from '@/lib/types';

export type ActivityKind = 'income' | 'expense' | 'lent' | 'borrowed';

export interface Activity {
  id: string;
  kind: ActivityKind;
  icon: IconName;
  title: string;
  subtitle: string;
  /** Signed paisa for display: incomes positive, expenses negative, loans as given. */
  amount: number;
  date: string;
  createdAt: string;
  /** Expense category key — expenses only. */
  category?: string;
  /** A returned or repaid loan. */
  settled?: boolean;
  /** Lower-case text with Latin digits that a search matches against. */
  searchText: string;
}

const newestFirst = (a: { date: string; createdAt: string }, b: { date: string; createdAt: string }) =>
  b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);

/** The amount both as shown ("1,250.50") and as typed ("1250.50"). */
function amountTerms(paisa: number): string {
  const shown = toLatinDigits(formatAmount(paisa));
  return `${shown} ${shown.replace(/,/g, '')}`;
}

function searchText(parts: (string | null | undefined)[]): string {
  return toLatinDigits(parts.filter(Boolean).join(' ')).toLowerCase();
}

/**
 * Every live income, expense and loan as a display row, newest first. `categories` are the
 * ones the user added — without them their entries would fall back to অন্যান্য. `loanPayments`
 * decide how much of a loan is still owed; without them every loan reads as untouched.
 */
export function buildActivities(
  incomes: Income[],
  expenses: Expense[],
  loans: Loan[],
  categories: Category[] = [],
  loanPayments: LoanPayment[] = [],
): Activity[] {
  const expenseCategories = categorySet('EXPENSE', categories);
  const incomeSources = categorySet('INCOME', categories);
  const items: Activity[] = [];
  for (const i of incomes) {
    if (i.isDeleted) continue;
    const source = incomeSources.find(i.source);
    items.push({
      id: i.id,
      kind: 'income',
      icon: source?.iconName ?? 'arrow-down',
      title: i.note || source?.label || 'আয়',
      subtitle: i.note && source ? source.label : 'আয়',
      amount: i.amount,
      date: i.date,
      createdAt: i.createdAt,
      searchText: searchText([i.note, source?.label, 'আয়', amountTerms(i.amount)]),
    });
  }
  for (const e of expenses) {
    if (e.isDeleted) continue;
    const meta = expenseCategories.meta(e.category);
    items.push({
      id: e.id,
      kind: 'expense',
      icon: meta.iconName,
      title: e.description || meta.label,
      subtitle: e.description ? meta.label : 'খরচ',
      amount: -e.amount,
      date: e.date,
      createdAt: e.createdAt,
      category: e.category,
      searchText: searchText([e.description, meta.label, meta.en, 'খরচ', amountTerms(e.amount)]),
    });
  }
  for (const l of loans) {
    if (l.isDeleted) continue;
    const lent = l.direction === 'LENT';
    const paid = paidOnLoan(l, loanPayments);
    const settled = paid >= l.amount;
    const kindLabel = lent ? 'ধার দেওয়া' : 'ধার নেওয়া';
    // Part of it back: what is left says more than "চলমান".
    const status = settled
      ? lent
        ? 'ফেরত পাওয়া'
        : 'শোধ করা'
      : paid > 0
        ? `বাকি ${formatTaka(l.amount - paid)}`
        : 'চলমান';
    items.push({
      id: l.id,
      kind: lent ? 'lent' : 'borrowed',
      icon: lent ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline',
      title: l.personName,
      subtitle: `${kindLabel} · ${status}`,
      amount: l.amount,
      date: l.date,
      createdAt: l.createdAt,
      settled,
      searchText: searchText([l.personName, l.note, kindLabel, lent ? 'পাওনা' : 'দেনা', 'লোন', amountTerms(l.amount)]),
    });
  }
  return items.sort(newestFirst);
}

export interface ActivityDay {
  day: DayKey;
  /** Newest first. */
  items: Activity[];
  /** Income and expense of the day in paisa, both positive; loans are not counted. */
  income: number;
  expense: number;
}

/** Groups rows by local calendar day, newest day first. */
export function groupByDay(items: Activity[]): ActivityDay[] {
  const days: ActivityDay[] = [];
  const byDay = new Map<DayKey, ActivityDay>();
  for (const item of [...items].sort(newestFirst)) {
    const day = dayKeyOf(item.date);
    let group = byDay.get(day);
    if (!group) {
      group = { day, items: [], income: 0, expense: 0 };
      byDay.set(day, group);
      days.push(group);
    }
    group.items.push(item);
    if (item.kind === 'income') group.income += item.amount;
    else if (item.kind === 'expense') group.expense -= item.amount;
  }
  return days;
}

export type ActivityType = 'all' | 'expense' | 'income' | 'loan';

export interface ActivityFilter {
  type?: ActivityType;
  /** Expense category key. */
  category?: string | null;
  /** Every word has to match; Bangla digits work too. */
  text?: string;
  /** Only this month; leave empty to look through everything. */
  monthKey?: MonthKey | null;
}

export function filterActivities(items: Activity[], filter: ActivityFilter): Activity[] {
  const type = filter.type ?? 'all';
  const words = toLatinDigits(filter.text ?? '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const pool = filter.monthKey ? rowsInMonth(items, filter.monthKey) : items;
  return pool.filter((item) => {
    if (type === 'loan' ? item.kind !== 'lent' && item.kind !== 'borrowed' : type !== 'all' && item.kind !== type) {
      return false;
    }
    if (filter.category && item.category !== filter.category) return false;
    return words.every((word) => item.searchText.includes(word));
  });
}

/** Heading for a day in a list: "আজ", "গতকাল" or "12 সেপ্টেম্বর · শনিবার" (with the year from another year). */
export function dayLabelBn(day: DayKey, today: DayKey = todayKey()): string {
  if (day === today) return 'আজ';
  if (day === shiftDayKey(today, -1)) return 'গতকাল';
  const iso = dayKeyToIso(day);
  const date = day.slice(0, 4) === today.slice(0, 4) ? dayMonthBn(iso) : fullDateBn(iso);
  return `${date} · ${weekdayBn(iso)}`;
}
