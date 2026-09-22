/**
 * Local reminders: a nudge to write the day's expenses, and a heads-up on the day a loan
 * is due back. Everything is scheduled on the device — no server, and nothing here needs
 * the internet, which is the point of an offline-first app.
 *
 * ⚠️ `expo-notifications` is **required lazily and only where it can run**, never at the
 * top of the file. Expo Go dropped the native side in SDK 53: on Android its push-token
 * auto-registration throws while the module is being evaluated, which no try/catch around
 * a later call can catch and which took the whole app down with it (the root layout
 * imports this). So the require is skipped in Expo Go entirely rather than attempted and
 * caught — attempting it is what produces the error in the first place.
 */
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

import { loanOutstanding } from '@/lib/calc';
import { dayKeyOf, daysBetween, shiftDayKey, todayKey, type DayKey } from '@/lib/date';
import { localDigits } from '@/lib/digits';
import { strings } from '@/lib/i18n';
import { formatTaka } from '@/lib/money';
import type { Loan, LoanPayment } from '@/lib/types';

/** How many days of the daily nudge are scheduled ahead. Each app open tops them up again. */
const DAILY_AHEAD = 7;
/** At most this many loan reminders, soonest due first — iOS caps pending notifications. */
const MAX_LOAN_REMINDERS = 16;
/** Loan reminders land mid-morning, when someone can still act on them. */
const LOAN_REMINDER_HOUR = 10;

type NotificationsModule = typeof import('expo-notifications');

/** undefined = not tried yet, null = tried and unusable here. */
let loaded: NotificationsModule | null | undefined;

/** The browser has nothing to schedule a notification on. */
export const notificationsOnWeb = Platform.OS === 'web';

/**
 * Expo Go on Android throws the moment expo-notifications is loaded (its push-token
 * registration runs at module scope), so reminders there need a development build.
 */
export const notificationsNeedDevBuild = Platform.OS === 'android' && isRunningInExpoGo();

/**
 * The native module, or null where it can't run (web, Expo Go). Loaded once and kept, so
 * a build without it warns a single time instead of on every reschedule.
 */
function notifications(): NotificationsModule | null {
  if (loaded !== undefined) return loaded;
  loaded = null;
  if (notificationsOnWeb || notificationsNeedDevBuild) return loaded;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = require('expo-notifications') as NotificationsModule;
    // Shows the reminder even while the app is open — otherwise it silently does nothing
    // for anyone who happens to have the app in front of them at the time.
    module.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    loaded = module;
  } catch (e) {
    // Not expected once Expo Go is ruled out, but a build without the native module
    // should still lose reminders rather than the whole app.
    console.warn('[notifications] module unavailable, reminders are off:', e);
  }
  return loaded;
}

/** Whether the last run left anything queued, so switching everything off still cancels it. */
let hasQueued = false;

/** Can reminders actually be scheduled here? False on web and in Expo Go. */
export function notificationsAvailable(): boolean {
  return notifications() !== null;
}

export interface ReminderSettings {
  /** The nudge to write down the day's expenses. */
  dailyEnabled: boolean;
  /** When it fires, as minutes from local midnight. */
  dailyMinutes: number;
  /** A heads-up on the day a loan is due back. */
  loanDueEnabled: boolean;
}

export const DEFAULT_REMINDERS: ReminderSettings = {
  dailyEnabled: false,
  dailyMinutes: 21 * 60, // 9 pm — after dinner, before the day is forgotten
  loanDueEnabled: false,
};

/** Asks for permission if it hasn't been granted yet. False means reminders can't be shown. */
export async function ensureNotificationPermission(): Promise<boolean> {
  const module = notifications();
  if (!module) return false;
  try {
    const current = await module.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const asked = await module.requestPermissionsAsync();
    return asked.granted;
  } catch (e) {
    console.warn('[notifications] permission check failed:', e);
    return false;
  }
}

/** Android shows nothing without a channel. Safe to call repeatedly. */
async function ensureChannel(module: NotificationsModule): Promise<void> {
  if (Platform.OS !== 'android') return;
  await module.setNotificationChannelAsync('reminders', {
    name: strings().notifications.channelName,
    importance: module.AndroidImportance.DEFAULT,
    lockscreenVisibility: module.AndroidNotificationVisibility.PRIVATE,
  });
}

interface Planned {
  at: Date;
  title: string;
  body: string;
}

/** The local moment `minutes` past midnight on `day`. */
function timeOn(day: DayKey, minutes: number): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, Math.floor(minutes / 60), minutes % 60, 0, 0);
}

/**
 * The daily nudge for the next few days. Today is left out when something has already
 * been written down — there is nothing to remind about, and a pointless reminder is the
 * fastest way to get notifications switched off.
 */
export function planDailyReminders(
  settings: ReminderSettings,
  loggedToday: boolean,
  today: DayKey = todayKey(),
  now: Date = new Date(),
): Planned[] {
  if (!settings.dailyEnabled) return [];
  const t = strings().notifications;
  const planned: Planned[] = [];
  for (let i = 0; i < DAILY_AHEAD; i++) {
    const day = shiftDayKey(today, i);
    if (i === 0 && loggedToday) continue;
    const at = timeOn(day, settings.dailyMinutes);
    if (at.getTime() <= now.getTime()) continue;
    planned.push({
      at,
      title: t.dailyTitle,
      body: t.dailyBody,
    });
  }
  return planned;
}

/** A reminder on the day each still-outstanding loan is due back. Past due dates are skipped. */
export function planLoanReminders(
  settings: ReminderSettings,
  loans: Loan[],
  payments: LoanPayment[],
  today: DayKey = todayKey(),
  now: Date = new Date(),
): Planned[] {
  if (!settings.loanDueEnabled) return [];
  const t = strings().notifications;
  return loans
    .filter((l) => !l.isDeleted && l.dueDate != null && loanOutstanding(l, payments) > 0)
    .map((loan) => ({ loan, day: dayKeyOf(loan.dueDate as string) }))
    .filter(({ day }) => daysBetween(today, day) >= 0)
    .sort((a, b) => a.day.localeCompare(b.day))
    .slice(0, MAX_LOAN_REMINDERS)
    .map(({ loan, day }) => ({
      at: timeOn(day, LOAN_REMINDER_HOUR * 60),
      title: loan.direction === 'LENT' ? t.loanLentTitle : t.loanBorrowedTitle,
      body:
        loan.direction === 'LENT'
          ? t.loanLentBody(loan.personName, formatTaka(loanOutstanding(loan, payments)))
          : t.loanBorrowedBody(loan.personName, formatTaka(loanOutstanding(loan, payments))),
    }))
    .filter((p) => p.at.getTime() > now.getTime());
}

/**
 * Replaces everything scheduled with what the current settings and data call for. The app
 * schedules nothing else, so clearing first keeps this idempotent — run it as often as
 * you like. Returns how many reminders are now queued.
 */
export async function rescheduleReminders(input: {
  settings: ReminderSettings;
  loggedToday: boolean;
  loans: Loan[];
  payments: LoanPayment[];
}): Promise<number> {
  // Nothing wanted and nothing of ours queued: don't load the native module at all, which
  // keeps the console quiet for anyone on a build without it who never turns a reminder on.
  if (!input.settings.dailyEnabled && !input.settings.loanDueEnabled && !hasQueued) return 0;

  const module = notifications();
  if (!module) return 0;

  const planned = [
    ...planDailyReminders(input.settings, input.loggedToday),
    ...planLoanReminders(input.settings, input.loans, input.payments),
  ];
  try {
    await module.cancelAllScheduledNotificationsAsync();
    hasQueued = false;
    if (planned.length === 0) return 0;
    if (!(await ensureNotificationPermission())) return 0;
    await ensureChannel(module);

    for (const item of planned) {
      await module.scheduleNotificationAsync({
        content: { title: item.title, body: item.body },
        trigger: {
          type: module.SchedulableTriggerInputTypes.DATE,
          date: item.at,
          channelId: 'reminders',
        },
      });
    }
    hasQueued = true;
    return planned.length;
  } catch (e) {
    console.warn('[notifications] scheduling failed:', e);
    return 0;
  }
}

/** "রাত ৯:০০" · "9:00 PM" — how a reminder time reads in the settings. */
export function timeLabel(minutes: number): string {
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return strings().notifications.timeLabel(localDigits(hour12), localDigits(String(minute).padStart(2, '0')), hour24);
}
