/**
 * Date & month-boundary helpers. Month boundaries use the device local
 * timezone (client is the calculation authority). Dates stored as ISO-8601.
 * Every number shown goes through localDigits (one numeral system app-wide).
 */
import { localDigits } from '@/lib/digits';

const BN_MONTHS = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
];

/** Full weekday names, Sunday first (same order as Date#getDay). */
export const BN_WEEKDAYS = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];

/** Short weekday names for calendar headers, Sunday first (same order as Date#getDay). */
export const BN_WEEKDAYS_SHORT = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];

export type MonthKey = string; // "YYYY-MM"
export type DayKey = string; // "YYYY-MM-DD" (local)

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

/** "জুন 2026" */
export function monthLabelBn(key: MonthKey): string {
  const { year, month } = parseMonthKey(key);
  return `${BN_MONTHS[month - 1]} ${localDigits(year)}`;
}

/** "18 জুন" from an ISO date. */
export function dayMonthBn(iso: string): string {
  const d = new Date(iso);
  return `${localDigits(d.getDate())} ${BN_MONTHS[d.getMonth()]}`;
}

/** "18 জুন 2026" */
export function fullDateBn(iso: string): string {
  const d = new Date(iso);
  return `${localDigits(d.getDate())} ${BN_MONTHS[d.getMonth()]} ${localDigits(d.getFullYear())}`;
}

export function monthName(month: number): string {
  return BN_MONTHS[month - 1] ?? '';
}

const BN_MONTHS_SHORT = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];

/** Short month name for chart labels: "সেপ্টে". */
export function monthShortBn(key: MonthKey): string {
  return BN_MONTHS_SHORT[parseMonthKey(key).month - 1] ?? '';
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

/** "রবিবার" from an ISO date. */
export function weekdayBn(iso: string): string {
  return BN_WEEKDAYS[new Date(iso).getDay()];
}

/** "রবি" from an ISO date — the short form used under chart columns. */
export function weekdayShortBn(iso: string): string {
  return BN_WEEKDAYS_SHORT[new Date(iso).getDay()];
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
export function relativeTimeBn(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const seconds = Math.round((now.getTime() - then.getTime()) / 1000);
  if (seconds < 60) return 'এইমাত্র';
  if (seconds < 3600) return `${localDigits(Math.floor(seconds / 60))} মিনিট আগে`;
  const today = dayKeyOfDate(now);
  if (dayKeyOfDate(then) === today) return `${localDigits(Math.floor(seconds / 3600))} ঘণ্টা আগে`;
  if (dayKeyOfDate(then) === shiftDayKey(today, -1)) return 'গতকাল';
  return fullDateBn(iso);
}
