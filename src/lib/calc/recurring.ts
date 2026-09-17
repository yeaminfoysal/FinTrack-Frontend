/**
 * Which days a standing entry has come due on. Pure — no React, no DB.
 *
 * A rule is a template; the money only exists once an occurrence becomes an ordinary
 * income/expense. Opening the app catches up on everything missed since `lastRunDay`,
 * the same idea as the month-close chain, and each occurrence gets an id derived from
 * the rule and its day — so the same occurrence generated on two devices is one row.
 */
import { BN_WEEKDAYS, dayKeyOf, daysBetween, dayKeyToIso, shiftDayKey, todayKey, type DayKey } from '@/lib/date';
import { localDigits } from '@/lib/digits';
import type { Recurring } from '@/lib/types';
import { uuidFrom } from '@/lib/uuid';

/**
 * How many missed occurrences a single catch-up will write. A rule left alone for years
 * shouldn't bury the month in entries the user never saw coming; the rest are skipped and
 * the rule carries on from today.
 */
export const MAX_CATCH_UP = 60;

/** Does the rule fall on this day? `startDate` and pausing are handled by dueOccurrences. */
function fallsOn(rule: Recurring, day: DayKey): boolean {
  if (rule.frequency === 'DAILY') return true;
  const date = new Date(dayKeyToIso(day));
  if (rule.frequency === 'WEEKLY') return date.getDay() === rule.anchor;
  // Monthly: a rule anchored past the end of a short month runs on that month's last day,
  // so "the 31st" still happens in February.
  const lastOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return date.getDate() === Math.min(rule.anchor, lastOfMonth);
}

/**
 * The days this rule owes an entry for, oldest first: every matching day after
 * `lastRunDay` (or from `startDate` if it has never run) up to and including `today`.
 * Empty for a paused rule, or one that starts later.
 */
export function dueOccurrences(rule: Recurring, today: DayKey = todayKey()): DayKey[] {
  if (rule.isPaused || rule.isDeleted) return [];
  const startDay = dayKeyOf(rule.startDate);
  const from = rule.lastRunDay && rule.lastRunDay >= startDay ? shiftDayKey(rule.lastRunDay, 1) : startDay;
  if (from > today) return [];

  const days: DayKey[] = [];
  // Walk the calendar rather than computing each date: one branch covers all three
  // frequencies, and the span is bounded by the catch-up cap below.
  for (let day = from, guard = daysBetween(from, today); guard >= 0; day = shiftDayKey(day, 1), guard--) {
    if (fallsOn(rule, day)) days.push(day);
    if (days.length >= MAX_CATCH_UP) break;
  }
  return days;
}

/**
 * The id the entry for this occurrence always gets. Two devices running the same rule for
 * the same day produce the same id, so the sync upsert keeps one row instead of two — and
 * an occurrence the user deleted is never silently written again.
 */
export function occurrenceId(rule: Recurring, day: DayKey): string {
  return uuidFrom(`recurring:${rule.id}:${day}`);
}

/** "প্রতি মাসের ১ তারিখে" · "প্রতি শুক্রবার" · "প্রতিদিন" — how a rule repeats, in one phrase. */
export function frequencyLabelBn(rule: Pick<Recurring, 'frequency' | 'anchor'>): string {
  if (rule.frequency === 'DAILY') return 'প্রতিদিন';
  if (rule.frequency === 'WEEKLY') return `প্রতি ${BN_WEEKDAYS[rule.anchor] ?? ''}`;
  return `প্রতি মাসের ${localDigits(rule.anchor)} তারিখে`;
}
