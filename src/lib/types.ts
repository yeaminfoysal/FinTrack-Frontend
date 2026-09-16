/** Local data model — mirrors the backend Prisma schema. All amounts are integer paisa. */

export type SyncStatus = 'PENDING' | 'SYNCED' | 'FAILED';
export type LoanDirection = 'LENT' | 'BORROWED';
export type LoanStatus = 'ACTIVE' | 'SETTLED';
/** Whether a category labels an expense or an income. */
export type CategoryKind = 'EXPENSE' | 'INCOME';

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
  status: LoanStatus;
  settledDate: string | null;
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
