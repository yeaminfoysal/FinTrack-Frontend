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
import type {
  Expense,
  Income,
  Loan,
  MonthlySummary,
  PracticalBalance,
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
  summaries: MonthlySummary[];
  practicals: PracticalBalance[];
  profile: UserProfile;
}

export function buildSeed(email = 'atizoom2@gmail.com'): SeedData {
  const curKey = currentMonthKey();
  const { year, month } = parseMonthKey(curKey);

  const incomes: Income[] = [
    { ...base(iso(year, month, 1)), amount: tk(55000), source: 'salary', date: iso(year, month, 1), note: 'বেতন — এই মাস' },
    { ...base(iso(year, month, 8)), amount: tk(8000), source: 'freelance', date: iso(year, month, 8), note: 'ফ্রিল্যান্স প্রজেক্ট' },
  ];

  const expenses: Expense[] = [
    { ...base(iso(year, month, 3)), amount: tk(3450), category: 'education', date: iso(year, month, 3), description: 'কোর্স ফি' },
    { ...base(iso(year, month, 5)), amount: tk(3200), category: 'utilities', date: iso(year, month, 5), description: 'বিদ্যুৎ ও ইন্টারনেট বিল' },
    { ...base(iso(year, month, 9)), amount: tk(6500), category: 'medical', date: iso(year, month, 9), description: 'ডাক্তার ও ঔষধ' },
    { ...base(iso(year, month, 12)), amount: tk(12000), category: 'shopping', date: iso(year, month, 12), description: 'নতুন জামা' },
    { ...base(iso(year, month, 18)), amount: tk(4200), category: 'food', date: iso(year, month, 18), description: 'বাজার ও খাবার' },
    { ...base(iso(year, month, 20)), amount: tk(1150), category: 'transport', date: iso(year, month, 20), description: 'যাতায়াত' },
    { ...base(iso(year, month, 22)), amount: tk(8000), category: 'others', date: iso(year, month, 22), description: 'মোবাইল রিচার্জ ও অন্যান্য' },
  ];

  const loans: Loan[] = [
    { ...base(iso(year, month, 15)), direction: 'LENT', personName: 'করিম উদ্দিন', amount: tk(7000), date: iso(year, month, 15), note: 'জরুরি দরকারে', status: 'ACTIVE', settledDate: null },
    { ...base(iso(year, month, 10)), direction: 'LENT', personName: 'সাব্বির আহমেদ', amount: tk(5000), date: iso(year, month, 10), note: 'বই কেনার জন্য', status: 'ACTIVE', settledDate: null },
    { ...base(iso(year, month, 2)), direction: 'LENT', personName: 'তানিয়া রহমান', amount: tk(3000), date: iso(year, month, 2), note: null, status: 'SETTLED', settledDate: iso(year, month, 20) },
    { ...base(iso(year, month, 5)), direction: 'BORROWED', personName: 'বড় ভাই (শাহীন)', amount: tk(20000), date: iso(year, month, 5), note: 'ল্যাপটপ কিনতে', status: 'ACTIVE', settledDate: null },
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

  const practicals: PracticalBalance[] = [
    { monthKey: curKey, cash: tk(18500), bank: tk(42000), mfs: tk(13700), amount: tk(74200), updatedAt: iso(year, month, 25) },
  ];

  const profile: UserProfile = {
    name: 'রাফিদ হাসান',
    email,
    openingSavings: tk(18500),
    currency: 'BDT',
    timezone: 'Asia/Dhaka',
  };

  return { incomes, expenses, loans, summaries, practicals, profile };
}
