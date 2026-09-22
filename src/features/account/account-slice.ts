/**
 * Whose data is on this device and getting it into memory: hydrate from SQLite (or the
 * web snapshot), reload after a sync pull, the demo dataset, and switching accounts.
 */
import {
  defaultProfile,
  DEMO_OWNER,
  type AccountActions,
  type DataFields,
  type DataSlice,
} from '@/features/data-state';
import { withDb, writeMeta } from '@/features/storage/persist';
import { loadWebSnapshot } from '@/features/storage/web-snapshot';
import { currentMonthKey } from '@/lib/date';
import { getDb } from '@/lib/db';
import {
  clearAllData,
  getCategories,
  getExpenses,
  getIncomes,
  getLoanPayments,
  getLoans,
  getMeta,
  getRecurrings,
  getPracticals,
  getSummaries,
  setMeta,
  upsertCategory,
  upsertExpense,
  upsertIncome,
  upsertLoan,
  upsertLoanPayment,
  upsertPractical,
  upsertRecurring,
  upsertSummary,
} from '@/lib/db/repo';
import { buildSeed } from '@/lib/db/seed';
import type { PracticalBalance, UserProfile } from '@/lib/types';

const practicalsByMonth = (rows: PracticalBalance[]): Record<string, PracticalBalance> =>
  Object.fromEntries(rows.map((p) => [p.monthKey, p]));

/**
 * An account that already has entries or an opening balance has clearly been set up —
 * whatever the flag says. Keeps everyone who used the app before onboarding existed
 * (and anyone restoring on a new device) out of the first-run screens.
 */
function hasStarted(fields: Pick<DataFields, 'incomes' | 'expenses' | 'loans' | 'profile'>): boolean {
  return (
    fields.incomes.length > 0 ||
    fields.expenses.length > 0 ||
    fields.loans.length > 0 ||
    fields.profile.openingSavings > 0
  );
}

export const createAccountSlice: DataSlice<DataFields & AccountActions> = (set, get) => ({
  ready: false,
  ownerEmail: null,
  monthKey: currentMonthKey(),
  incomes: [],
  expenses: [],
  loans: [],
  loanPayments: [],
  categories: [],
  recurrings: [],
  summaries: [],
  practicals: {},
  profile: defaultProfile(),
  profileDirty: false,
  onboardingDone: false,
  lastExpenseCategory: null,
  lastIncomeSource: null,

  // Load whatever is already stored for this device/account. Never auto-seeds:
  // a real (non-demo) account starts empty and fills via its own entries/sync.
  init: () => {
    if (get().ready) return;
    const db = getDb();

    if (db) {
      const profileRaw = getMeta(db, 'profile');
      const stored = {
        ownerEmail: getMeta(db, 'ownerEmail'),
        incomes: getIncomes(db),
        expenses: getExpenses(db),
        loans: getLoans(db),
        loanPayments: getLoanPayments(db),
        categories: getCategories(db),
        recurrings: getRecurrings(db),
        summaries: getSummaries(db),
        practicals: practicalsByMonth(getPracticals(db)),
        profile: profileRaw ? (JSON.parse(profileRaw) as UserProfile) : defaultProfile(),
        profileDirty: getMeta(db, 'profileDirty') === '1',
        lastExpenseCategory: getMeta(db, 'lastExpenseCategory') || null,
        lastIncomeSource: getMeta(db, 'lastIncomeSource') || null,
      };
      set({
        ready: true,
        ...stored,
        onboardingDone: getMeta(db, 'onboardingDone') === '1' || hasStarted(stored),
      });
      return;
    }

    // No SQLite (web): hydrate from the localStorage snapshot if one exists.
    const saved = loadWebSnapshot();
    if (!saved) {
      set({ ready: true });
      return;
    }
    set({
      ready: true,
      ...saved,
      onboardingDone: saved.onboardingDone || hasStarted({ ...get(), ...saved }),
    });
  },

  reloadFromDb: () => {
    const db = getDb();
    if (!db) return;
    try {
      set({
        incomes: getIncomes(db),
        expenses: getExpenses(db),
        loans: getLoans(db),
        loanPayments: getLoanPayments(db),
        categories: getCategories(db),
        recurrings: getRecurrings(db),
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
      seed.loanPayments.forEach((r) => upsertLoanPayment(db, r));
      seed.categories.forEach((r) => upsertCategory(db, r));
      seed.recurrings.forEach((r) => upsertRecurring(db, r));
      seed.summaries.forEach((r) => upsertSummary(db, r));
      seed.practicals.forEach((r) => upsertPractical(db, r));
      setMeta(db, 'profile', JSON.stringify(seed.profile));
      setMeta(db, 'ownerEmail', DEMO_OWNER);
      setMeta(db, 'profileDirty', '0');
      // The demo comes fully set up; first-run screens would only get in the way.
      setMeta(db, 'onboardingDone', '1');
    });
    set({
      ready: true,
      ownerEmail: DEMO_OWNER,
      incomes: seed.incomes,
      expenses: seed.expenses,
      loans: seed.loans,
      loanPayments: seed.loanPayments,
      categories: seed.categories,
      recurrings: seed.recurrings,
      summaries: seed.summaries,
      practicals: practicalsByMonth(seed.practicals),
      profile: seed.profile,
      profileDirty: false,
      onboardingDone: true,
    });
  },

  prepareForUser: (email, patch) => {
    // Same account already owns the local data → keep it, just apply any patch.
    if (get().ownerEmail === email) {
      if (patch) get().updateProfile(patch);
      return;
    }
    // Different owner (or leftover demo data) → wipe and start fresh.
    const nextProfile: UserProfile = { ...defaultProfile(), email, ...patch };
    withDb((db) => {
      clearAllData(db);
      setMeta(db, 'profile', JSON.stringify(nextProfile));
      setMeta(db, 'ownerEmail', email);
      setMeta(db, 'lastSyncTime', '');
      setMeta(db, 'lastSyncedAt', '');
      setMeta(db, 'profileDirty', '0');
      setMeta(db, 'lastExpenseCategory', '');
      setMeta(db, 'lastIncomeSource', '');
      setMeta(db, 'onboardingDone', '0');
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
      loanPayments: [],
      categories: [],
      recurrings: [],
      summaries: [],
      practicals: {},
      profile: nextProfile,
      profileDirty: false,
      // A fresh account on this device starts at the beginning — unless the server already
      // holds an opening balance from a previous device, which the patch brings along.
      onboardingDone: (patch?.openingSavings ?? 0) > 0,
      lastExpenseCategory: null,
      lastIncomeSource: null,
    });
  },

  completeOnboarding: () => {
    writeMeta('onboardingDone', '1');
    set({ onboardingDone: true });
  },

  setMonthKey: (key) => set({ monthKey: key }),
});
