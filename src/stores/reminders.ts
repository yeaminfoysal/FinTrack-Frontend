/**
 * Reminder settings. They live on the device, not the account — which notifications you
 * want on your phone is not something another device should decide — so they sit in the
 * local meta table and never sync.
 */
import { create } from 'zustand';

import { writeMeta } from '@/features/storage/persist';
import { getDb } from '@/lib/db';
import { getMeta } from '@/lib/db/repo';
import {
  DEFAULT_REMINDERS,
  ensureNotificationPermission,
  notificationsAvailable,
  type ReminderSettings,
} from '@/lib/notifications';

const META_KEY = 'reminders';

interface RemindersState extends ReminderSettings {
  /** Settings have been read from storage; before that they are the defaults. */
  loaded: boolean;
  load: () => void;
  /**
   * Applies a change, asking for notification permission the first time something is
   * switched on. Returns false when permission was refused and nothing was turned on.
   */
  update: (patch: Partial<ReminderSettings>) => Promise<boolean>;
}

function read(): ReminderSettings {
  try {
    const db = getDb();
    const raw = db ? getMeta(db, META_KEY) : typeof localStorage !== 'undefined' ? localStorage.getItem(META_KEY) : null;
    return raw ? { ...DEFAULT_REMINDERS, ...(JSON.parse(raw) as Partial<ReminderSettings>) } : DEFAULT_REMINDERS;
  } catch {
    return DEFAULT_REMINDERS;
  }
}

function write(settings: ReminderSettings): void {
  const value = JSON.stringify(settings);
  writeMeta(META_KEY, value);
  try {
    if (!getDb() && typeof localStorage !== 'undefined') localStorage.setItem(META_KEY, value);
  } catch {
    // storage blocked — the setting still holds for this session
  }
}

export const useRemindersStore = create<RemindersState>((set, get) => ({
  ...DEFAULT_REMINDERS,
  loaded: false,

  load: () => {
    if (get().loaded) return;
    set({ ...read(), loaded: true });
  },

  update: async (patch) => {
    const turningOn = (patch.dailyEnabled ?? false) || (patch.loanDueEnabled ?? false);
    if (turningOn && notificationsAvailable() && !(await ensureNotificationPermission())) return false;

    const { loaded, load, update, ...current } = get();
    const next: ReminderSettings = { ...current, ...patch };
    set(next);
    write(next);
    return true;
  },
}));
