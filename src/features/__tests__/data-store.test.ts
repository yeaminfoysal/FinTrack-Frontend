import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { loanOutstanding, loanSettled } from '@/lib/calc';
import { currentMonthKey } from '@/lib/date';
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
