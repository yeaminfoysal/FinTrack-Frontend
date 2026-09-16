/** Record builders for unit tests. Dates are built in local time, so tests pass in any timezone. */
import type {
  Category,
  CategoryKind,
  Expense,
  Income,
  Loan,
  LoanDirection,
  MonthlySummary,
  PracticalBalance,
} from '@/lib/types';

let lastId = 0;

/** Taka → paisa. */
export const tk = (taka: number) => taka * 100;

/** A local date-time as ISO. Month is 1-based. */
export function at(year: number, month: number, day: number, hour = 12, minute = 0): string {
  return new Date(year, month - 1, day, hour, minute).toISOString();
}

function base(date: string) {
  lastId += 1;
  return {
    id: `record-${lastId}`,
    createdAt: date,
    updatedAt: date,
    isDeleted: false,
    deletedAt: null,
    syncStatus: 'SYNCED' as const,
  };
}

export function income(amount: number, date: string, fields: Partial<Income> = {}): Income {
  return { ...base(date), amount, source: 'salary', date, note: null, ...fields };
}

export function expense(amount: number, date: string, fields: Partial<Expense> = {}): Expense {
  return { ...base(date), amount, category: 'food', date, description: null, ...fields };
}

/** One of the user's own categories. Its id is the key an expense/income stores. */
export function category(kind: CategoryKind, label: string, fields: Partial<Category> = {}): Category {
  return {
    ...base(at(2026, 1, 1)),
    kind,
    label,
    icon: '📱',
    iconName: 'phone-portrait-outline',
    ...fields,
  };
}

export function loan(direction: LoanDirection, amount: number, date: string, fields: Partial<Loan> = {}): Loan {
  return {
    ...base(date),
    direction,
    personName: 'করিম',
    amount,
    date,
    note: null,
    status: 'ACTIVE',
    settledDate: null,
    ...fields,
  };
}

export function summary(year: number, month: number, figures: Partial<MonthlySummary> = {}): MonthlySummary {
  return {
    ...base(at(year, month, 28)),
    year,
    month,
    openingBalance: 0,
    totalIncome: 0,
    totalDailyExpense: 0,
    outstandingLent: 0,
    outstandingBorrowed: 0,
    untrackedExpense: 0,
    monthlySaving: 0,
    closingBalance: 0,
    practicalBalance: null,
    ...figures,
  };
}

/** A practical balance counted at `countedAt`, all in cash. */
export function counted(monthKey: string, amount: number, countedAt: string): PracticalBalance {
  return { monthKey, cash: amount, bank: 0, mfs: 0, amount, countedAt, updatedAt: countedAt, syncStatus: 'SYNCED' };
}
