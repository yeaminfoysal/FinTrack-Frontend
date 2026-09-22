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
  dayMonth,
  fullDate,
  shiftDayKey,
  todayKey,
  weekday,
  type DayKey,
  type MonthKey,
} from '@/lib/date';
import { toLatinDigits } from '@/lib/digits';
import { getLanguage, stringsFor, type Lang } from '@/lib/i18n';
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

/** Every name a category goes by — so a search finds it whichever language wrote it. */
function categoryTerms(option: { label: string; searchTerms?: string[] } | undefined): string[] {
  if (!option) return [];
  return option.searchTerms ?? [option.label];
}

/**
 * Every live income, expense and loan as a display row, newest first. `categories` are the
 * ones the user added — without them their entries would fall back to অন্যান্য. `loanPayments`
 * decide how much of a loan is still owed; without them every loan reads as untouched.
 * `lang` is the language the rows are written in.
 */
export function buildActivities(
  incomes: Income[],
  expenses: Expense[],
  loans: Loan[],
  categories: Category[] = [],
  loanPayments: LoanPayment[] = [],
  lang: Lang = getLanguage(),
): Activity[] {
  const t = stringsFor(lang).activity;
  const expenseCategories = categorySet('EXPENSE', categories, lang);
  const incomeSources = categorySet('INCOME', categories, lang);
  const items: Activity[] = [];
  for (const i of incomes) {
    if (i.isDeleted) continue;
    const source = incomeSources.find(i.source);
    items.push({
      id: i.id,
      kind: 'income',
      icon: source?.iconName ?? 'arrow-down',
      title: i.note || source?.label || t.income,
      subtitle: i.note && source ? source.label : t.income,
      amount: i.amount,
      date: i.date,
      createdAt: i.createdAt,
      searchText: searchText([i.note, ...categoryTerms(source), t.income, amountTerms(i.amount)]),
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
      subtitle: e.description ? meta.label : t.expense,
      amount: -e.amount,
      date: e.date,
      createdAt: e.createdAt,
      category: e.category,
      searchText: searchText([e.description, ...categoryTerms(meta), t.expense, amountTerms(e.amount)]),
    });
  }
  for (const l of loans) {
    if (l.isDeleted) continue;
    const lent = l.direction === 'LENT';
    const paid = paidOnLoan(l, loanPayments);
    const settled = paid >= l.amount;
    const kindLabel = lent ? t.lent : t.borrowed;
    // Part of it back: what is left says more than "চলমান".
    const status = settled ? (lent ? t.returned : t.repaid) : paid > 0 ? t.remaining(formatTaka(l.amount - paid)) : t.ongoing;
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
      searchText: searchText([
        l.personName,
        l.note,
        kindLabel,
        lent ? t.searchReceivable : t.searchPayable,
        t.searchLoan,
        amountTerms(l.amount),
      ]),
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
export function dayLabel(day: DayKey, today: DayKey = todayKey(), lang: Lang = getLanguage()): string {
  const t = stringsFor(lang);
  if (day === today) return t.common.today;
  if (day === shiftDayKey(today, -1)) return t.common.yesterday;
  const iso = dayKeyToIso(day);
  const date = day.slice(0, 4) === today.slice(0, 4) ? dayMonth(iso) : fullDate(iso);
  return t.activity.dayHeading(date, weekday(iso));
}
