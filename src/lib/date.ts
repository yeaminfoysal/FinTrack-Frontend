/**
 * Date & month-boundary helpers. Month boundaries use the device local
 * timezone (client is the calculation authority). Dates stored as ISO-8601.
 */

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
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

/** Convert Latin digits in a string to Bengali digits. */
export function toBnDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

export type MonthKey = string; // "YYYY-MM"

export function monthKeyOf(date: Date): MonthKey {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
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
  const d = new Date(iso);
  return monthKeyOf(d) === key;
}

/** Previous month key. */
export function prevMonthKey(key: MonthKey): MonthKey {
  const { year, month } = parseMonthKey(key);
  const d = new Date(year, month - 2, 1);
  return monthKeyOf(d);
}

/** Next month key. */
export function nextMonthKey(key: MonthKey): MonthKey {
  const { year, month } = parseMonthKey(key);
  const d = new Date(year, month, 1);
  return monthKeyOf(d);
}

/** "জুন ২০২৬" */
export function monthLabelBn(key: MonthKey): string {
  const { year, month } = parseMonthKey(key);
  return `${BN_MONTHS[month - 1]} ${toBnDigits(year)}`;
}

/** "১৮ জুন" from an ISO date. */
export function dayMonthBn(iso: string): string {
  const d = new Date(iso);
  return `${toBnDigits(d.getDate())} ${BN_MONTHS[d.getMonth()]}`;
}

/** "১৮ জুন ২০২৬" */
export function fullDateBn(iso: string): string {
  const d = new Date(iso);
  return `${toBnDigits(d.getDate())} ${BN_MONTHS[d.getMonth()]} ${toBnDigits(d.getFullYear())}`;
}

export function monthName(month: number): string {
  return BN_MONTHS[month - 1] ?? '';
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Local "YYYY-MM-DD" for today, for prefilling date inputs. */
export function todayInputDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Parse a "YYYY-MM-DD" input to a local-noon ISO string (falls back to now). */
export function inputDateToIso(input: string): string {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(input.trim());
  if (!m) return new Date().toISOString();
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}
