/**
 * First-run demo seed. Pure (no DB) — returns records that reproduce the exact
 * figures shown in FinTrackPrototype.html, anchored to the current local month
 * so the dashboard always looks populated regardless of the date.
 *
 * Cross-check (current month):
 *   Theoretical = 45,000 + 63,000 + 20,000 − 38,500 − 12,000 = 77,500
 *   Untracked   = 77,500 − 74,200 = 3,300
 *   Saving      = 63,000 − (38,500 + 3,300) = 21,200
 *   Net Worth   = 74,200 + 12,000 − 20,000 = 66,200
 */
import { currentMonthKey, parseMonthKey, prevMonthKey } from '@/lib/date';
import { strings } from '@/lib/i18n';
import type {
  Category,
  Expense,
  Income,
  Loan,
  LoanPayment,
  MonthlySummary,
  PracticalBalance,
  Recurring,
  UserProfile,
} from '@/lib/types';
import { uuidv4 } from '@/lib/uuid';

const tk = (taka: number) => taka * 100; // taka -> paisa

function base(dateIso: string) {
  return {
    id: uuidv4(),
    isDeleted: false,
    deletedAt: null,
    syncStatus: 'SYNCED' as const,
    createdAt: dateIso,
    updatedAt: dateIso,
  };
}

function iso(year: number, month1: number, day: number, hour = 10): string {
  return new Date(year, month1 - 1, day, hour, 0, 0, 0).toISOString();
}

export interface SeedData {
  incomes: Income[];
  expenses: Expense[];
  loans: Loan[];
  loanPayments: LoanPayment[];
  categories: Category[];
  recurrings: Recurring[];
  summaries: MonthlySummary[];
  practicals: PracticalBalance[];
  profile: UserProfile;
}

/**
 * Demo account identity. example.com is reserved for documentation, so it can never be a
 * real inbox. The name is a function because it is read in whichever language is set when
 * the demo is seeded.
 */
export const demoName = (): string => strings().demo.name;
export const DEMO_EMAIL = 'rafid.hasan@example.com';

export function buildSeed(email = DEMO_EMAIL): SeedData {
  const d = strings().demo;
  const curKey = currentMonthKey();
  const { year, month } = parseMonthKey(curKey);

  // Two categories the demo user added, so the demo shows what a custom one looks like.
  // An entry stores the category's id, so they are built first.
  const categories: Category[] = [
    { ...base(iso(year, month, 1)), kind: 'EXPENSE', label: d.categoryRecharge, icon: '📱', iconName: 'phone-portrait-outline' },
    { ...base(iso(year, month, 1)), kind: 'INCOME', label: d.categoryTuition, icon: '📖', iconName: 'book-outline' },
  ];
  const [rechargeCategory] = categories;

  const incomes: Income[] = [
    { ...base(iso(year, month, 1)), amount: tk(55000), source: 'salary', date: iso(year, month, 1), note: d.noteSalaryThisMonth },
    { ...base(iso(year, month, 8)), amount: tk(8000), source: 'freelance', date: iso(year, month, 8), note: d.noteFreelance },
  ];

  const expenses: Expense[] = [
    { ...base(iso(year, month, 3)), amount: tk(3450), category: 'education', date: iso(year, month, 3), description: d.expenseCourseFee },
    { ...base(iso(year, month, 5)), amount: tk(3200), category: 'utilities', date: iso(year, month, 5), description: d.expenseUtilities },
    { ...base(iso(year, month, 9)), amount: tk(6500), category: 'medical', date: iso(year, month, 9), description: d.expenseMedical },
    { ...base(iso(year, month, 12)), amount: tk(12000), category: 'shopping', date: iso(year, month, 12), description: d.expenseClothes },
    { ...base(iso(year, month, 18)), amount: tk(4200), category: 'food', date: iso(year, month, 18), description: d.expenseGroceries },
    { ...base(iso(year, month, 20)), amount: tk(1150), category: 'transport', date: iso(year, month, 20), description: d.expenseTransport },
    { ...base(iso(year, month, 22)), amount: tk(8000), category: rechargeCategory.id, date: iso(year, month, 22), description: d.expenseRecharge },
  ];


  // করিম's ৳9,000 is partly back already, সাব্বির's ৳7,000 is untouched and তানিয়া's was settled
  // the old way (status only) — together they cover every shape a loan can be in.
  // Outstanding lent stays ৳12,000: (9,000 − 4,000) + 7,000.
  const loans: Loan[] = [
    { ...base(iso(year, month, 15)), direction: 'LENT', personName: d.personKarim, amount: tk(9000), date: iso(year, month, 15), note: d.loanUrgent, status: 'ACTIVE', settledDate: null, dueDate: iso(year, month + 1, 5) },
    { ...base(iso(year, month, 10)), direction: 'LENT', personName: d.personSabbir, amount: tk(7000), date: iso(year, month, 10), note: d.loanBooks, status: 'ACTIVE', settledDate: null, dueDate: iso(year, month, 20) },
    { ...base(iso(year, month, 2)), direction: 'LENT', personName: d.personTania, amount: tk(3000), date: iso(year, month, 2), note: null, status: 'SETTLED', settledDate: iso(year, month, 20), dueDate: null },
    { ...base(iso(year, month, 5)), direction: 'BORROWED', personName: d.personShaheen, amount: tk(20000), date: iso(year, month, 5), note: d.loanLaptop, status: 'ACTIVE', settledDate: null, dueDate: iso(year, month + 1, 25) },
  ];

  const [karim] = loans;
  const loanPayments: LoanPayment[] = [
    { ...base(iso(year, month, 21)), loanId: karim.id, amount: tk(4000), date: iso(year, month, 21), note: d.paymentFirst },
  ];

  // Standing entries the demo user set up. They already ran this month (lastRunDay), so
  // opening the demo doesn't add entries on top of the figures above.
  const recurrings: Recurring[] = [
    {
      ...base(iso(year, month, 1)),
      kind: 'EXPENSE',
      amount: tk(12000),
      category: 'utilities',
      note: d.recurringRent,
      frequency: 'MONTHLY',
      anchor: 1,
      startDate: iso(year, month, 1),
      lastRunDay: `${curKey}-01`,
      isPaused: false,
    },
    {
      ...base(iso(year, month, 1)),
      kind: 'INCOME',
      amount: tk(55000),
      category: 'salary',
      note: d.recurringSalary,
      frequency: 'MONTHLY',
      anchor: 1,
      startDate: iso(year, month, 1),
      lastRunDay: `${curKey}-01`,
      isPaused: false,
    },
  ];

  // Closed-month chain (carry-forward): 18,500 → 22,000 → 30,000 → 45,000
  const summaries: MonthlySummary[] = [];

  const p1 = prevMonthKey(curKey); // -1 (closing 45,000)
  const p2 = prevMonthKey(p1); // -2 (closing 30,000)
  const p3 = prevMonthKey(p2); // -3 (closing 22,000)

  const mk = (
    key: string,
    opening: number,
    income: number,
    expense: number,
    untracked: number,
    lent: number,
    borrowed: number,
    closing: number,
  ): MonthlySummary => {
    const { year: y, month: m } = parseMonthKey(key);
    const dateIso = iso(y, m, 28);
    return {
      ...base(dateIso),
      year: y,
      month: m,
      openingBalance: tk(opening),
      totalIncome: tk(income),
      totalDailyExpense: tk(expense),
      outstandingLent: tk(lent),
      outstandingBorrowed: tk(borrowed),
      untrackedExpense: tk(untracked),
      monthlySaving: tk(closing - opening),
      closingBalance: tk(closing),
      practicalBalance: tk(closing),
    };
  };

  summaries.push(mk(p1, 30000, 63000, 31200, 1800, 12000, 20000, 45000)); // saving 15,000
  summaries.push(mk(p2, 22000, 52000, 29600, 2400, 8000, 0, 30000)); // saving 8,000
  summaries.push(mk(p3, 18500, 41000, 30600, 900, 5000, 0, 22000)); // saving 3,500

  // Counted when the demo starts, so entries added from then on move the cash (see calc/practical).
  const countedAt = new Date().toISOString();
  const practicals: PracticalBalance[] = [
    {
      monthKey: curKey,
      cash: tk(18500),
      bank: tk(42000),
      mfs: tk(13700),
      amount: tk(74200),
      countedAt,
      updatedAt: countedAt,
      syncStatus: 'SYNCED',
    },
  ];

  const profile: UserProfile = {
    name: d.name,
    email,
    openingSavings: tk(18500),
    currency: 'BDT',
    timezone: 'Asia/Dhaka',
  };

  return { incomes, expenses, loans, loanPayments, categories, recurrings, summaries, practicals, profile };
}
