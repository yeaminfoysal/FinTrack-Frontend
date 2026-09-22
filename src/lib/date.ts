/**
 * Date & month-boundary helpers. Month boundaries use the device local
 * timezone (client is the calculation authority). Dates stored as ISO-8601.
 * Every number shown goes through localDigits (one numeral system app-wide).
 *
 * Anything with a name in it (a month, a weekday, "just now") reads the current
 * language's catalogue, so these stay plain functions the whole app can call.
 */
import { localDigits } from '@/lib/digits';
import { strings } from '@/lib/i18n';

export type MonthKey = string; // "YYYY-MM"
export type DayKey = string; // "YYYY-MM-DD" (local)

/** Full weekday names, Sunday first (same order as Date#getDay). */
export const weekdayNames = (): string[] => strings().date.weekdays;

/** Short weekday names for calendar headers, Sunday first (same order as Date#getDay). */
export const weekdayNamesShort = (): string[] => strings().date.weekdaysShort;

const pad2 = (n: number) => String(n).padStart(2, '0');

export function monthKeyOf(date: Date): MonthKey {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

export function currentMonthKey(): MonthKey {
  return monthKeyOf(new Date());
}

export function parseMonthKey(key: MonthKey): { year: number; month: number } {
  const [y, m] = key.split('-').map(Number);
  return { year: y, month: m }; // month is 1-based
}

/** Local [start, endExclusive) ISO range for a given year/month (1-based month). */
export function monthRangeLocal(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 1, 0, 0, 0, 0);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function monthRangeOfKey(key: MonthKey) {
  const { year, month } = parseMonthKey(key);
  return monthRangeLocal(year, month);
}

/** Is the ISO date within the local month of `key`? */
export function isInMonth(iso: string, key: MonthKey): boolean {
  return monthKeyOf(new Date(iso)) === key;
}

/** Previous month key. */
export function prevMonthKey(key: MonthKey): MonthKey {
  const { year, month } = parseMonthKey(key);
  return monthKeyOf(new Date(year, month - 2, 1));
}

/** Next month key. */
export function nextMonthKey(key: MonthKey): MonthKey {
  const { year, month } = parseMonthKey(key);
  return monthKeyOf(new Date(year, month, 1));
}

/** "জুন 2026" · "June 2026" */
export function monthLabel(key: MonthKey): string {
  const { year, month } = parseMonthKey(key);
  const t = strings().date;
  return t.monthYear(t.months[month - 1], localDigits(year));
}

/** "18 জুন" · "18 June" from an ISO date. */
export function dayMonth(iso: string): string {
  const d = new Date(iso);
  const t = strings().date;
  return t.dayMonth(localDigits(d.getDate()), t.months[d.getMonth()]);
}

/** "18 জুন 2026" · "18 June 2026" */
export function fullDate(iso: string): string {
  const d = new Date(iso);
  const t = strings().date;
  return t.fullDate(localDigits(d.getDate()), t.months[d.getMonth()], localDigits(d.getFullYear()));
}

/** Full name of a 1-based month. */
export function monthName(month: number): string {
  return strings().date.months[month - 1] ?? '';
}

/** Short month name for chart labels: "সেপ্টে" · "Sep". */
export function monthShort(key: MonthKey): string {
  return strings().date.monthsShort[parseMonthKey(key).month - 1] ?? '';
}

/** The `count` months that end with `end`, oldest first. */
export function monthsEndingAt(end: MonthKey, count: number): MonthKey[] {
  const keys = [end];
  while (keys.length < count) keys.unshift(prevMonthKey(keys[0]));
  return keys;
}

/** Local calendar day "YYYY-MM-DD" of a Date. */
export function dayKeyOfDate(date: Date): DayKey {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Local calendar day "YYYY-MM-DD" of an ISO date — used to group records by day. */
export function dayKeyOf(iso: string): DayKey {
  return dayKeyOfDate(new Date(iso));
}

/** Today as a local DayKey. */
export function todayKey(): DayKey {
  return dayKeyOfDate(new Date());
}

/** The day `days` days after (or before, when negative) `day`. */
export function shiftDayKey(day: DayKey, days: number): DayKey {
  const [y, m, d] = day.split('-').map(Number);
  return dayKeyOfDate(new Date(y, m - 1, d + days));
}

/** A DayKey as an ISO timestamp at local noon, so the calendar day survives timezone shifts. */
export function dayKeyToIso(day: DayKey): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
}

/** "রবিবার" · "Sunday" from an ISO date. */
export function weekday(iso: string): string {
  return strings().date.weekdays[new Date(iso).getDay()];
}

/** "রবি" · "Sun" from an ISO date — the short form used under chart columns. */
export function weekdayShort(iso: string): string {
  return strings().date.weekdaysShort[new Date(iso).getDay()];
}

/** Whole days from `from` to `to` — negative when `to` is the earlier day. */
export function daysBetween(from: DayKey, to: DayKey): number {
  const asDate = (day: DayKey) => {
    const [y, m, d] = day.split('-').map(Number);
    return new Date(y, m - 1, d).getTime();
  };
  return Math.round((asDate(to) - asDate(from)) / 86_400_000);
}

/** Number of days in the month of `key`. */
export function daysInMonth(key: MonthKey): number {
  const { year, month } = parseMonthKey(key);
  return new Date(year, month, 0).getDate();
}

/** "এইমাত্র" / "5 মিনিট আগে" / "3 ঘণ্টা আগে" / "গতকাল" / a full date. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const t = strings();
  const then = new Date(iso);
  const seconds = Math.round((now.getTime() - then.getTime()) / 1000);
  if (seconds < 60) return t.date.justNow;
  if (seconds < 3600) return t.date.minutesAgo(localDigits(Math.floor(seconds / 60)));
  const today = dayKeyOfDate(now);
  if (dayKeyOfDate(then) === today) return t.date.hoursAgo(localDigits(Math.floor(seconds / 3600)));
  if (dayKeyOfDate(then) === shiftDayKey(today, -1)) return t.common.yesterday;
  return fullDate(iso);
}
