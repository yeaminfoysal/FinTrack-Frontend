/**
 * Whose data is on this device and getting it into memory: hydrate from SQLite (or the
 * web snapshot), reload after a sync pull, the demo dataset, and switching accounts.
 */
import {
  DEFAULT_PROFILE,
  DEMO_OWNER,
  type AccountActions,
  type DataFields,
  type DataSlice,
} from '@/features/data-state';
import { withDb } from '@/features/storage/persist';
import { loadWebSnapshot } from '@/features/storage/web-snapshot';
import { currentMonthKey } from '@/lib/date';
import { getDb } from '@/lib/db';
import {
  clearAllData,
  getExpenses,
  getIncomes,
  getLoans,
  getMeta,
  getPracticals,
  getSummaries,
  setMeta,
  upsertExpense,
  upsertIncome,
  upsertLoan,
  upsertPractical,
  upsertSummary,
} from '@/lib/db/repo';
import { buildSeed } from '@/lib/db/seed';
import type { PracticalBalance, UserProfile } from '@/lib/types';

const practicalsByMonth = (rows: PracticalBalance[]): Record<string, PracticalBalance> =>
  Object.fromEntries(rows.map((p) => [p.monthKey, p]));

export const createAccountSlice: DataSlice<DataFields & AccountActions> = (set, get) => ({
  ready: false,
  ownerEmail: null,
  monthKey: currentMonthKey(),
  incomes: [],
  expenses: [],
  loans: [],
  summaries: [],
  practicals: {},
  profile: DEFAULT_PROFILE,
  profileDirty: false,
  lastExpenseCategory: null,
  lastIncomeSource: null,

  // Load whatever is already stored for this device/account. Never auto-seeds:
  // a real (non-demo) account starts empty and fills via its own entries/sync.
  init: () => {
    if (get().ready) return;
    const db = getDb();

    if (db) {
      const profileRaw = getMeta(db, 'profile');
      set({
        ready: true,
        ownerEmail: getMeta(db, 'ownerEmail'),
        incomes: getIncomes(db),
        expenses: getExpenses(db),
        loans: getLoans(db),
        summaries: getSummaries(db),
        practicals: practicalsByMonth(getPracticals(db)),
        profile: profileRaw ? (JSON.parse(profileRaw) as UserProfile) : DEFAULT_PROFILE,
        profileDirty: getMeta(db, 'profileDirty') === '1',
        lastExpenseCategory: getMeta(db, 'lastExpenseCategory') || null,
        lastIncomeSource: getMeta(db, 'lastIncomeSource') || null,
      });
      return;
    }

    // No SQLite (web): hydrate from the localStorage snapshot if one exists.
    const saved = loadWebSnapshot();
    set(saved ? { ready: true, ...saved } : { ready: true });
  },

  reloadFromDb: () => {
    const db = getDb();
    if (!db) return;
    try {
      set({
        incomes: getIncomes(db),
        expenses: getExpenses(db),
        loans: getLoans(db),
        summaries: getSummaries(db),
        practicals: practicalsByMonth(getPracticals(db)),
      });
    } catch {
      // ignore
    }
  },

  seedDemo: () => {
    const seed = buildSeed();
    withDb((db) => {
      clearAllData(db);
      seed.incomes.forEach((r) => upsertIncome(db, r));
      seed.expenses.forEach((r) => upsertExpense(db, r));
      seed.loans.forEach((r) => upsertLoan(db, r));
      seed.summaries.forEach((r) => upsertSummary(db, r));
      seed.practicals.forEach((r) => upsertPractical(db, r));
      setMeta(db, 'profile', JSON.stringify(seed.profile));
      setMeta(db, 'ownerEmail', DEMO_OWNER);
      setMeta(db, 'profileDirty', '0');
    });
    set({
      ready: true,
      ownerEmail: DEMO_OWNER,
      incomes: seed.incomes,
      expenses: seed.expenses,
      loans: seed.loans,
      summaries: seed.summaries,
      practicals: practicalsByMonth(seed.practicals),
      profile: seed.profile,
      profileDirty: false,
    });
  },

  prepareForUser: (email, patch) => {
    // Same account already owns the local data → keep it, just apply any patch.
    if (get().ownerEmail === email) {
      if (patch) get().updateProfile(patch);
      return;
    }
    // Different owner (or leftover demo data) → wipe and start fresh.
    const nextProfile: UserProfile = { ...DEFAULT_PROFILE, email, ...patch };
    withDb((db) => {
      clearAllData(db);
      setMeta(db, 'profile', JSON.stringify(nextProfile));
      setMeta(db, 'ownerEmail', email);
      setMeta(db, 'lastSyncTime', '');
      setMeta(db, 'lastSyncedAt', '');
      setMeta(db, 'profileDirty', '0');
      setMeta(db, 'lastExpenseCategory', '');
      setMeta(db, 'lastIncomeSource', '');
    });
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('lastSyncTime');
      localStorage.removeItem('lastSyncedAt');
    }
    set({
      ready: true,
      ownerEmail: email,
      incomes: [],
      expenses: [],
      loans: [],
      summaries: [],
      practicals: {},
      profile: nextProfile,
      profileDirty: false,
      lastExpenseCategory: null,
      lastIncomeSource: null,
    });
  },

  setMonthKey: (key) => set({ monthKey: key }),
});
