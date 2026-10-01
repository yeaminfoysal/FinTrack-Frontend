import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { computeDashboard, loanOutstanding, loanSettled } from '@/lib/calc';
import { currentMonthKey, parseMonthKey, prevMonthKey } from '@/lib/date';
import { useDataStore } from '@/stores/data';
import { counted, tk } from '@/test/factories';

// No SQLite and no sync in unit tests: the store runs purely in memory.
jest.mock('@/lib/db', () => ({ getDb: () => null }));
jest.mock('@/features/storage/persist', () => ({ withDb: jest.fn(), writeMeta: jest.fn(), requestSync: jest.fn() }));

const month = currentMonthKey();
const s = () => useDataStore.getState();
const practical = () => s().practicals[month].amount;

beforeEach(() => {
  // Counted an hour ago, so every entry logged by the test moves the balance.
  const countedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  useDataStore.setState({
    ready: false, // keeps month-close out of these tests
    incomes: [],
    expenses: [],
    loans: [],
    loanPayments: [],
    summaries: [],
    practicals: { [month]: counted(month, tk(1000), countedAt) },
  });
});

describe('record actions', () => {
  it('add, edit, delete and restore an expense keep the counted balance in step', () => {
    const id = s().addExpense({ amount: tk(100), category: 'food' });
    expect(practical()).toBe(tk(900));
    expect(s().lastExpenseCategory).toBe('food');

    s().updateExpense(id, { amount: tk(250) });
    expect(s().expenses[0]).toMatchObject({ id, amount: tk(250), syncStatus: 'PENDING' });
    expect(practical()).toBe(tk(750));

    s().deleteExpense(id);
    expect(s().expenses[0]).toMatchObject({ isDeleted: true, syncStatus: 'PENDING' });
    expect(practical()).toBe(tk(1000));

    const afterDelete = s().expenses;
    s().deleteExpense(id);
    expect(s().expenses).toBe(afterDelete);

    s().restoreExpense(id);
    expect(s().expenses[0]).toMatchObject({ isDeleted: false, deletedAt: null });
    expect(practical()).toBe(tk(750));
  });

  it('adds income to the balance and remembers the source', () => {
    s().addIncome({ amount: tk(500), source: 'salary' });
    expect(practical()).toBe(tk(1500));
    expect(s().lastIncomeSource).toBe('salary');
    expect(s().incomes).toHaveLength(1);
  });

  it('settles a loan by recording a repayment for what is left, and only once', () => {
    const id = s().addLoan({ direction: 'LENT', personName: 'করিম', amount: tk(300) });
    expect(practical()).toBe(tk(700));

    const paymentId = s().settleLoan(id);
    expect(paymentId).not.toBeNull();
    expect(s().loanPayments[0]).toMatchObject({ loanId: id, amount: tk(300), syncStatus: 'PENDING' });
    expect(practical()).toBe(tk(1000));

    // Nothing is left to settle, so a second call records nothing.
    const payments = s().loanPayments;
    expect(s().settleLoan(id)).toBeNull();
    expect(s().loanPayments).toBe(payments);

    s().deleteLoanPayment(paymentId!);
    expect(practical()).toBe(tk(700));
  });

  it('lets a loan come back in parts and settles it when the parts add up', () => {
    const id = s().addLoan({ direction: 'LENT', personName: 'করিম', amount: tk(500) });
    expect(practical()).toBe(tk(500));

    s().addLoanPayment({ loanId: id, amount: tk(200) });
    expect(loanOutstanding(s().loans[0], s().loanPayments)).toBe(tk(300));
    expect(practical()).toBe(tk(700));

    s().settleLoan(id);
    expect(s().loanPayments).toHaveLength(2);
    expect(loanSettled(s().loans[0], s().loanPayments)).toBe(true);
    expect(practical()).toBe(tk(1000));
  });

  it('takes the repayments down with a deleted loan and brings them back on restore', () => {
    const id = s().addLoan({ direction: 'BORROWED', personName: 'শাহীন', amount: tk(400) });
    s().addLoanPayment({ loanId: id, amount: tk(150) });
    expect(practical()).toBe(tk(1250));

    s().deleteLoan(id);
    expect(s().loanPayments[0]).toMatchObject({ isDeleted: true });
    expect(practical()).toBe(tk(1000));

    s().restoreLoan(id);
    expect(s().loanPayments[0]).toMatchObject({ isDeleted: false, deletedAt: null });
    expect(practical()).toBe(tk(1250));
  });

  it('reopens a loan settled the old way, without touching repayments', () => {
    const id = s().addLoan({ direction: 'LENT', personName: 'তানিয়া', amount: tk(300) });
    // A row that came from a device on the old schema: settled by status alone.
    useDataStore.setState({
      loans: s().loans.map((l) => ({ ...l, status: 'SETTLED' as const, settledDate: new Date().toISOString() })),
    });

    s().unsettleLoan(id);
    expect(s().loans[0]).toMatchObject({ status: 'ACTIVE', settledDate: null });
  });

  it('ignores an unknown id', () => {
    const before = s().incomes;
    s().updateIncome('missing', { amount: tk(1) });
    expect(s().incomes).toBe(before);
  });
});

describe('counting a month that has ended', () => {
  const ended = prevMonthKey(month);
  const { year, month: m } = parseMonthKey(ended);
  const inEnded = (day: number) => new Date(year, m - 1, day, 12).toISOString();
  const endedSummary = () => s().summaries.find((r) => r.year === year && r.month === m)!;

  beforeEach(() => {
    useDataStore.setState({
      ownerEmail: 'me@example.com',
      profile: { ...s().profile, openingSavings: tk(1000) },
      practicals: {},
      ready: true, // month-close runs from here on
    });
  });

  it("settles that month's untracked and the next opening, and later backdated entries close the gap", () => {
    s().addExpense({ amount: tk(200), category: 'food', date: inEnded(10) });
    expect(endedSummary()).toMatchObject({ untrackedExpense: 0, closingBalance: tk(800) });

    // On the 1st of the new month: "on the 30th I had ৳700".
    s().setPractical(ended, { cash: tk(700), bank: 0, mfs: 0 });
    expect(endedSummary()).toMatchObject({
      practicalBalance: tk(700),
      untrackedExpense: tk(100),
      monthlySaving: -tk(300),
      closingBalance: tk(700),
    });
    const { incomes, expenses, loans, summaries } = s();
    const running = computeDashboard({ monthKey: month, incomes, expenses, loans, summaries, baseOpening: tk(1000), practical: null });
    expect(running.opening).toBe(tk(700));

    // A forgotten expense from that month, logged now: the count already had it, so only the gap narrows.
    s().addExpense({ amount: tk(60), category: 'food', date: inEnded(20) });
    expect(s().practicals[ended].amount).toBe(tk(700));
    expect(endedSummary()).toMatchObject({ untrackedExpense: tk(40), closingBalance: tk(700) });
  });
});
