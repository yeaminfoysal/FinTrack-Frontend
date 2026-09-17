/** Local data model — mirrors the backend Prisma schema. All amounts are integer paisa. */

export type SyncStatus = 'PENDING' | 'SYNCED' | 'FAILED';
export type LoanDirection = 'LENT' | 'BORROWED';
export type LoanStatus = 'ACTIVE' | 'SETTLED';
/** Whether a category labels an expense or an income. */
export type CategoryKind = 'EXPENSE' | 'INCOME';
/** How often a standing entry repeats. */
export type RecurringFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface BaseRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  deletedAt: string | null;
  syncStatus: SyncStatus;
}

export interface Income extends BaseRecord {
  amount: number;
  source: string;
  date: string; // ISO
  note: string | null;
}

export interface Expense extends BaseRecord {
  amount: number;
  category: string;
  date: string; // ISO
  description: string | null;
}

/**
 * A category the user added on top of the built-in ones (src/constants/categories.ts).
 * Its `id` is what expense.category / income.source store, so renaming it keeps every
 * entry attached; a deleted one still resolves, so older entries keep their name.
 */
export interface Category extends BaseRecord {
  kind: CategoryKind;
  label: string;
  /** Emoji, used in the PDF report. */
  icon: string;
  /** Ionicons name, used in the app. */
  iconName: string;
}

export interface Loan extends BaseRecord {
  direction: LoanDirection;
  personName: string;
  amount: number;
  date: string; // ISO
  note: string | null;
  /**
   * Legacy one-shot settle. A loan settled from this version on records a LoanPayment
   * instead, so `status` stays ACTIVE and what is left comes from its payments.
   */
  status: LoanStatus;
  settledDate: string | null;
  /** When the money is expected back — optional, and it may be in the future. */
  dueDate: string | null;
}

/**
 * Money paid back against a loan: an instalment returned on a LENT loan, a repayment
 * made on a BORROWED one. A loan is settled once its payments reach its amount, so a
 * partial repayment simply lowers what is outstanding.
 */
export interface LoanPayment extends BaseRecord {
  loanId: string;
  amount: number;
  date: string; // ISO
  note: string | null;
}

/**
 * A standing entry the app writes for the user — rent, salary, an internet bill. It is a
 * template, not money: opening the app turns the occurrences that have come due since the
 * last run into ordinary incomes/expenses, which are what every calculation then sees.
 */
export interface Recurring extends BaseRecord {
  kind: CategoryKind;
  amount: number;
  /** Expense category key for EXPENSE, income source key for INCOME. */
  category: string;
  /** Goes into the generated entry's description / note. */
  note: string | null;
  frequency: RecurringFrequency;
  /** Day of the month (1–31) when MONTHLY, weekday (0 = Sunday) when WEEKLY, unused when DAILY. */
  anchor: number;
  /** Nothing is generated before this day (ISO). */
  startDate: string;
  /** The last day already generated for (DayKey); null means nothing has run yet. */
  lastRunDay: string | null;
  /** Paused rules stay in the list but generate nothing. */
  isPaused: boolean;
}

export interface MonthlySummary extends BaseRecord {
  year: number;
  month: number; // 1-based
  openingBalance: number;
  totalIncome: number;
  totalDailyExpense: number;
  outstandingLent: number;
  outstandingBorrowed: number;
  untrackedExpense: number;
  monthlySaving: number;
  closingBalance: number;
  practicalBalance: number | null;
}

export interface PracticalBalance {
  monthKey: string;
  cash: number;
  bank: number;
  mfs: number;
  amount: number; // cash + bank + mfs
  /** When the user counted it. Money that moved before then is already inside the amount. */
  countedAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

export interface UserProfile {
  name: string;
  email: string;
  openingSavings: number; // paisa
  currency: string;
  timezone: string;
}
