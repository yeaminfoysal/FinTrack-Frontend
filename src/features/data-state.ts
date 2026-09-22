/**
 * The data store's shape. Each feature folder builds one slice of it and
 * src/stores/data.ts puts the slices together into useDataStore.
 */
import type { StateCreator } from 'zustand';

import type { MonthKey } from '@/lib/date';
import { strings } from '@/lib/i18n';
import type {
  Category,
  CategoryKind,
  Expense,
  Income,
  Loan,
  LoanDirection,
  LoanPayment,
  MonthlySummary,
  PracticalBalance,
  Recurring,
  RecurringFrequency,
  UserProfile,
} from '@/lib/types';

/**
 * The profile an account starts on. A function, not a constant: the stand-in name
 * is read in the language set at the time, and that is chosen after this module
 * has already been evaluated.
 */
export const defaultProfile = (): UserProfile => ({
  name: strings().profile.defaultName,
  email: '',
  openingSavings: 0,
  currency: 'BDT',
  timezone: 'Asia/Dhaka',
});

/** ownerEmail of the offline demo dataset. Demo data is never synced. */
export const DEMO_OWNER = '__demo__';

export interface AddIncomeInput {
  amount: number;
  source: string;
  date?: string;
  note?: string | null;
  /** Fixed id, so a recurring occurrence keeps the same one on every device. */
  id?: string;
}
export interface AddExpenseInput {
  amount: number;
  category: string;
  date?: string;
  description?: string | null;
  /** Fixed id, so a recurring occurrence keeps the same one on every device. */
  id?: string;
}
export interface AddCategoryInput {
  kind: CategoryKind;
  label: string;
  /** Ionicons name; the matching report emoji is derived from it. */
  iconName: string;
}

export interface AddLoanInput {
  direction: LoanDirection;
  personName: string;
  amount: number;
  date?: string;
  note?: string | null;
  /** When the money is expected back — may be in the future. */
  dueDate?: string | null;
}

export interface AddLoanPaymentInput {
  loanId: string;
  amount: number;
  date?: string;
  note?: string | null;
}

export interface AddRecurringInput {
  kind: CategoryKind;
  amount: number;
  category: string;
  note?: string | null;
  frequency: RecurringFrequency;
  /** Day of the month (1–31) when MONTHLY, weekday (0 = Sunday) when WEEKLY. */
  anchor: number;
  /** Nothing is generated before this day; defaults to today. */
  startDate?: string;
}

export interface DataFields {
  ready: boolean;
  ownerEmail: string | null;
  monthKey: MonthKey;
  /** Record arrays are replaced on every change, never mutated — calc caches its month index per array. */
  incomes: Income[];
  expenses: Expense[];
  loans: Loan[];
  /** Repayments against loans — a loan is settled once its payments reach its amount. */
  loanPayments: LoanPayment[];
  /** Categories the user added; the built-in ones live in src/constants/categories.ts. */
  categories: Category[];
  /** Standing entries (rent, salary, a bill) that write themselves when they come due. */
  recurrings: Recurring[];
  summaries: MonthlySummary[];
  practicals: Record<MonthKey, PracticalBalance>;
  profile: UserProfile;
  /** Name or opening savings edited on this device and not yet sent to the server. */
  profileDirty: boolean;
  /** First-run setup is behind the user; an account with entries counts as done. */
  onboardingDone: boolean;
  /** Pre-selected in the add forms: the category / source used last time. */
  lastExpenseCategory: string | null;
  lastIncomeSource: string | null;
}

export interface AccountActions {
  init: () => void;
  /** Reloads all data from SQLite into memory (used after a background sync pull). */
  reloadFromDb: () => void;
  /** Seed the demo dataset (only for "continue as demo"). */
  seedDemo: () => void;
  /** Point local storage at a real account; wipes data if the owner changed. */
  prepareForUser: (email: string, patch?: Partial<UserProfile>) => void;
  /** First-run setup is finished; the app stops sending the user there. */
  completeOnboarding: () => void;
  setMonthKey: (key: MonthKey) => void;
}

export interface IncomeActions {
  /** Returns the new record's id (e.g. for an undo). */
  addIncome: (input: AddIncomeInput) => string;
  updateIncome: (id: string, patch: Partial<AddIncomeInput>) => void;
  deleteIncome: (id: string) => void;
  /** Undoes a delete. */
  restoreIncome: (id: string) => void;
}

export interface ExpenseActions {
  addExpense: (input: AddExpenseInput) => string;
  updateExpense: (id: string, patch: Partial<AddExpenseInput>) => void;
  deleteExpense: (id: string) => void;
  restoreExpense: (id: string) => void;
}

export interface LoanActions {
  addLoan: (input: AddLoanInput) => string;
  updateLoan: (id: string, patch: Partial<AddLoanInput>) => void;
  /**
   * Settles the rest of a loan by recording a repayment for whatever is still owed.
   * Returns that payment's id — pass it to deleteLoanPayment to undo — or null when
   * there was nothing left to settle.
   */
  settleLoan: (id: string, settledDate?: string) => string | null;
  /** Reopens a loan settled the old way (status only, no payment rows). */
  unsettleLoan: (id: string) => void;
  /** Soft-deletes the loan together with its repayments. */
  deleteLoan: (id: string) => void;
  restoreLoan: (id: string) => void;
  /** A part (or all) of a loan coming back; returns the new record's id. */
  addLoanPayment: (input: AddLoanPaymentInput) => string;
  deleteLoanPayment: (id: string) => void;
  restoreLoanPayment: (id: string) => void;
}

export interface CategoryActions {
  /** Returns the new category id — also the key entries store. */
  addCategory: (input: AddCategoryInput) => string;
  updateCategory: (id: string, patch: Partial<Pick<Category, 'label' | 'iconName'>>) => void;
  /** Soft delete: entries already on it keep showing its name, it just stops being offered. */
  deleteCategory: (id: string) => void;
  restoreCategory: (id: string) => void;
}

export interface RecurringActions {
  /** Returns the new rule's id. */
  addRecurring: (input: AddRecurringInput) => string;
  updateRecurring: (id: string, patch: Partial<AddRecurringInput>) => void;
  /** Stops a rule generating without losing it. */
  setRecurringPaused: (id: string, paused: boolean) => void;
  deleteRecurring: (id: string) => void;
  restoreRecurring: (id: string) => void;
  /**
   * Catch-up: writes an income/expense for every occurrence that has come due since each
   * rule last ran, and returns how many were written. Idempotent — an occurrence whose
   * entry already exists (even as a tombstone the user deleted) is skipped.
   */
  runRecurring: () => number;
}

export interface PracticalActions {
  /** A freshly counted balance: entries logged from now on keep it current. */
  setPractical: (monthKey: MonthKey, parts: { cash: number; bank: number; mfs: number }) => void;
}

export interface ProfileActions {
  /** Applies profile values without marking them for upload (server data, sign-in). */
  updateProfile: (patch: Partial<UserProfile>) => void;
  /** A profile edit by the user: saved locally and sent to the server on the next sync. */
  editProfile: (patch: Partial<Pick<UserProfile, 'name' | 'openingSavings'>>) => void;
  markProfileSynced: () => void;
}

export interface MonthCloseActions {
  /**
   * Month-close catch-up: (re)computes the summary of every month before the
   * running one and persists only the months whose figures changed.
   */
  closeMonths: () => void;
}

export type DataState = DataFields &
  AccountActions &
  IncomeActions &
  ExpenseActions &
  LoanActions &
  CategoryActions &
  RecurringActions &
  PracticalActions &
  ProfileActions &
  MonthCloseActions;

/** One feature's part of the store. */
export type DataSlice<T> = StateCreator<DataState, [], [], T>;
