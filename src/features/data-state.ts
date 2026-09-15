/**
 * The data store's shape. Each feature folder builds one slice of it and
 * src/stores/data.ts puts the slices together into useDataStore.
 */
import type { StateCreator } from 'zustand';

import type { MonthKey } from '@/lib/date';
import type {
  Expense,
  Income,
  Loan,
  LoanDirection,
  MonthlySummary,
  PracticalBalance,
  UserProfile,
} from '@/lib/types';

export const DEFAULT_PROFILE: UserProfile = {
  name: 'ব্যবহারকারী',
  email: '',
  openingSavings: 0,
  currency: 'BDT',
  timezone: 'Asia/Dhaka',
};

/** ownerEmail of the offline demo dataset. Demo data is never synced. */
export const DEMO_OWNER = '__demo__';

export interface AddIncomeInput {
  amount: number;
  source: string;
  date?: string;
  note?: string | null;
}
export interface AddExpenseInput {
  amount: number;
  category: string;
  date?: string;
  description?: string | null;
}
export interface AddLoanInput {
  direction: LoanDirection;
  personName: string;
  amount: number;
  date?: string;
  note?: string | null;
}

export interface DataFields {
  ready: boolean;
  ownerEmail: string | null;
  monthKey: MonthKey;
  /** Record arrays are replaced on every change, never mutated — calc caches its month index per array. */
  incomes: Income[];
  expenses: Expense[];
  loans: Loan[];
  summaries: MonthlySummary[];
  practicals: Record<MonthKey, PracticalBalance>;
  profile: UserProfile;
  /** Name or opening savings edited on this device and not yet sent to the server. */
  profileDirty: boolean;
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
  settleLoan: (id: string, settledDate?: string) => void;
  /** Marks a settled loan active again (undo of settle). */
  unsettleLoan: (id: string) => void;
  deleteLoan: (id: string) => void;
  restoreLoan: (id: string) => void;
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
  PracticalActions &
  ProfileActions &
  MonthCloseActions;

/** One feature's part of the store. */
export type DataSlice<T> = StateCreator<DataState, [], [], T>;
