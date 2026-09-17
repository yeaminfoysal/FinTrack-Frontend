import { describe, expect, it } from '@jest/globals';

import {
  carryForwardOpening,
  closedMonthChain,
  computeDashboard,
  dailyExpenses,
  monthDailyExpense,
  monthIncome,
  monthlySaving,
  netWorth,
  loanOutstanding,
  loanSettled,
  openingForMonth,
  paidOnLoan,
  recentDaySpends,
  outstandingLoans,
  outstandingLoansAt,
  theoreticalBalance,
  totalExpense,
  untrackedExpense,
  type MonthChainInput,
} from '@/lib/calc';
import { currentMonthKey, monthRangeOfKey } from '@/lib/date';
import { buildSeed } from '@/lib/db/seed';
import { at, expense, income, loan, loanPayment, summary, tk } from '@/test/factories';

describe('§B–§F formulas', () => {
  // The demo month: opening 45,000 · income 63,000 · borrowed 20,000 · expense 38,500 · lent 12,000.
  const theoretical = theoreticalBalance({
    opening: tk(45000),
    monthIncome: tk(63000),
    outstandingBorrowed: tk(20000),
    monthDailyExpense: tk(38500),
    outstandingLent: tk(12000),
  });

  it('theoretical balance adds borrowed money and subtracts lent money', () => {
    expect(theoretical).toBe(tk(77500));
  });

  it('untracked is theoretical − practical, and 0 without a practical balance', () => {
    expect(untrackedExpense(theoretical, tk(74200))).toBe(tk(3300));
    expect(untrackedExpense(theoretical, null)).toBe(0);
    expect(untrackedExpense(theoretical, undefined)).toBe(0);
    // More in hand than expected: negative, shown as untracked income.
    expect(untrackedExpense(theoretical, tk(78000))).toBe(-tk(500));
  });

  it('saving subtracts untracked, which makes it practical − opening + lent − borrowed', () => {
    const saving = monthlySaving(tk(63000), tk(38500), tk(3300));
    expect(saving).toBe(tk(21200));
    expect(saving).toBe(tk(74200) - tk(45000) + tk(12000) - tk(20000));
  });

  it('carry forward, total expense and net worth', () => {
    expect(carryForwardOpening(tk(30000), tk(15000))).toBe(tk(45000));
    expect(totalExpense(tk(38500), tk(12000), tk(3300))).toBe(tk(53800));
    expect(netWorth(tk(74200), tk(12000), tk(20000))).toBe(tk(66200));
  });
});

describe('outstanding loans', () => {
  it('sums active, undeleted loans of one direction', () => {
    const loans = [
      loan('LENT', tk(7000), at(2026, 9, 15)),
      loan('LENT', tk(5000), at(2026, 9, 10)),
      loan('LENT', tk(3000), at(2026, 9, 2), { status: 'SETTLED', settledDate: at(2026, 9, 20) }),
      loan('LENT', tk(900), at(2026, 9, 3), { isDeleted: true }),
      loan('BORROWED', tk(20000), at(2026, 9, 5)),
    ];
    expect(outstandingLoans(loans, 'LENT')).toBe(tk(12000));
    expect(outstandingLoans(loans, 'BORROWED')).toBe(tk(20000));
  });

  it('as of a month end, counts loans given before it and not yet settled then', () => {
    const augustEnd = monthRangeOfKey('2026-08').end;
    const loans = [
      loan('LENT', tk(1000), at(2026, 8, 10)),
      loan('LENT', tk(2000), at(2026, 8, 12), { status: 'SETTLED', settledDate: at(2026, 9, 3) }),
      loan('LENT', tk(4000), at(2026, 8, 14), { status: 'SETTLED', settledDate: at(2026, 8, 20) }),
      loan('LENT', tk(8000), at(2026, 9, 2)),
    ];
    // Settling later doesn't rewrite August; the September loan isn't in it.
    expect(outstandingLoansAt(loans, 'LENT', augustEnd)).toBe(tk(3000));
  });
});

describe('loan repayments', () => {
  const lent = loan('LENT', tk(9000), at(2026, 9, 15));

  it('counts what came back, and calls the loan settled once the parts add up', () => {
    const part = loanPayment(lent.id, tk(4000), at(2026, 9, 21));
    expect(paidOnLoan(lent, [part])).toBe(tk(4000));
    expect(loanOutstanding(lent, [part])).toBe(tk(5000));
    expect(loanSettled(lent, [part])).toBe(false);

    const rest = loanPayment(lent.id, tk(5000), at(2026, 9, 28));
    expect(loanOutstanding(lent, [part, rest])).toBe(0);
    expect(loanSettled(lent, [part, rest])).toBe(true);
  });

  it('ignores deleted repayments and ones belonging to another loan', () => {
    const payments = [
      loanPayment(lent.id, tk(4000), at(2026, 9, 21), { isDeleted: true }),
      loanPayment('another-loan', tk(4000), at(2026, 9, 21)),
    ];
    expect(paidOnLoan(lent, payments)).toBe(0);
  });

  it('never lets an overpayment push the loan past settled', () => {
    expect(loanOutstanding(lent, [loanPayment(lent.id, tk(12000), at(2026, 9, 21))])).toBe(0);
  });

  it('takes a legacy settle as the whole amount, with or without payment rows', () => {
    const old = loan('LENT', tk(3000), at(2026, 9, 2), { status: 'SETTLED', settledDate: at(2026, 9, 20) });
    expect(paidOnLoan(old, [])).toBe(tk(3000));
    expect(loanSettled(old, [])).toBe(true);
  });

  it('lowers the outstanding total by what has come back', () => {
    const loans = [lent, loan('LENT', tk(7000), at(2026, 9, 10))];
    const payments = [loanPayment(lent.id, tk(4000), at(2026, 9, 21))];
    expect(outstandingLoans(loans, 'LENT')).toBe(tk(16000));
    expect(outstandingLoans(loans, 'LENT', payments)).toBe(tk(12000));
  });

  it('as of a month end, only counts repayments made by then', () => {
    const augustEnd = monthRangeOfKey('2026-08').end;
    const august = loan('LENT', tk(5000), at(2026, 8, 5));
    const payments = [
      loanPayment(august.id, tk(2000), at(2026, 8, 20)),
      loanPayment(august.id, tk(3000), at(2026, 9, 4)), // settles it, but after August closed
    ];
    expect(outstandingLoansAt([august], 'LENT', augustEnd, payments)).toBe(tk(3000));
  });
});

describe('month scope', () => {
  it('counts income and daily expense by local month', () => {
    const incomes = [
      income(tk(100), at(2026, 9, 1, 0, 5)),
      income(tk(50), at(2026, 8, 31, 23, 55)),
      income(tk(7), at(2026, 9, 2), { isDeleted: true }),
    ];
    expect(monthIncome(incomes, '2026-09')).toBe(tk(100));
    expect(monthIncome(incomes, '2026-08')).toBe(tk(50));
  });

  it('groups a month by day, newest day and newest entry first, adding up to the month', () => {
    const a = expense(tk(100), at(2026, 9, 3, 9));
    const b = expense(tk(40), at(2026, 9, 5, 8));
    const c = expense(tk(60), at(2026, 9, 5, 20));
    const otherMonth = expense(tk(999), at(2026, 10, 1));
    const all = [a, b, c, otherMonth];

    const days = dailyExpenses(all, '2026-09');

    expect(days.map((d) => d.day)).toEqual(['2026-09-05', '2026-09-03']);
    expect(days[0].items.map((e) => e.id)).toEqual([c.id, b.id]);
    expect(days[0].total).toBe(tk(100));
    expect(days.reduce((sum, d) => sum + d.total, 0)).toBe(monthDailyExpense(all, '2026-09'));
  });
});

describe('openingForMonth', () => {
  it('uses the previous closing, else the latest earlier closing, else the base opening', () => {
    const august = summary(2026, 8, { closingBalance: tk(45000) });
    const june = summary(2026, 6, { closingBalance: tk(22000) });
    expect(openingForMonth([august, june], tk(1000), '2026-09')).toBe(tk(45000));
    expect(openingForMonth([june], tk(1000), '2026-09')).toBe(tk(22000));
    expect(openingForMonth([], tk(1000), '2026-09')).toBe(tk(1000));
  });
});

describe('closedMonthChain', () => {
  const base: MonthChainInput = {
    currentKey: '2026-09',
    baseOpening: tk(18000),
    incomes: [income(tk(50000), at(2026, 7, 1)), income(tk(52000), at(2026, 8, 1))],
    expenses: [expense(tk(30000), at(2026, 7, 10)), expense(tk(31000), at(2026, 8, 10))],
    loans: [],
    summaries: [],
    practicalFor: () => null,
  };

  it('closes every month before the current one; each closing is the next opening', () => {
    const chain = closedMonthChain(base);
    expect(chain.map((m) => [m.year, m.month])).toEqual([
      [2026, 7],
      [2026, 8],
    ]);
    expect(chain[0]).toMatchObject({ openingBalance: tk(18000), monthlySaving: tk(20000), closingBalance: tk(38000) });
    expect(chain[1]).toMatchObject({ openingBalance: tk(38000), monthlySaving: tk(21000), closingBalance: tk(59000) });
  });

  it('flows a backdated change into every later month', () => {
    const chain = closedMonthChain({ ...base, expenses: [...base.expenses, expense(tk(1000), at(2026, 7, 15))] });
    expect(chain.map((m) => m.closingBalance)).toEqual([tk(37000), tk(58000)]);
  });

  it('uses the loans outstanding at each month end and folds untracked into the saving', () => {
    const chain = closedMonthChain({
      ...base,
      loans: [loan('LENT', tk(5000), at(2026, 7, 20), { status: 'SETTLED', settledDate: at(2026, 8, 5) })],
      // July: 18,000 + 50,000 − 30,000 − 5,000 lent = 33,000 expected; 32,000 counted.
      practicalFor: (key) => (key === '2026-07' ? tk(32000) : null),
    });
    expect(chain[0]).toMatchObject({
      outstandingLent: tk(5000),
      untrackedExpense: tk(1000),
      monthlySaving: tk(19000),
      closingBalance: tk(37000),
    });
    expect(chain[1]).toMatchObject({ outstandingLent: 0, openingBalance: tk(37000) });
  });

  it('treats more money than expected as untracked income that raises the saving', () => {
    const chain = closedMonthChain({
      ...base,
      currentKey: '2026-08',
      expenses: [],
      practicalFor: () => tk(70000),
    });
    // 18,000 + 50,000 = 68,000 expected, 70,000 counted.
    expect(chain[0]).toMatchObject({ untrackedExpense: -tk(2000), monthlySaving: tk(52000), closingBalance: tk(70000) });
  });

  it('is empty without any records', () => {
    expect(closedMonthChain({ ...base, incomes: [], expenses: [] })).toEqual([]);
  });
});

describe('computeDashboard', () => {
  it('reproduces the demo figures', () => {
    const seed = buildSeed();
    const snapshot = computeDashboard({
      monthKey: currentMonthKey(),
      incomes: seed.incomes,
      expenses: seed.expenses,
      loans: seed.loans,
      payments: seed.loanPayments,
      summaries: seed.summaries,
      baseOpening: seed.profile.openingSavings,
      practical: seed.practicals[0].amount,
    });
    expect(snapshot).toMatchObject({
      opening: tk(45000),
      theoretical: tk(77500),
      untracked: tk(3300),
      saving: tk(21200),
      netWorth: tk(66200),
    });
  });

  it('shows a closed month exactly as stored, whatever the live records say', () => {
    const august = summary(2026, 8, {
      openingBalance: tk(30000),
      totalIncome: tk(63000),
      totalDailyExpense: tk(31200),
      untrackedExpense: tk(1800),
      monthlySaving: tk(30000),
      closingBalance: tk(60000),
      practicalBalance: tk(60000),
    });
    const snapshot = computeDashboard({
      monthKey: '2026-08',
      incomes: [income(tk(1), at(2026, 8, 3))],
      expenses: [],
      loans: [],
      summaries: [august],
      baseOpening: 0,
      practical: null,
    });
    expect(snapshot).toMatchObject({
      opening: tk(30000),
      monthIncome: tk(63000),
      theoretical: tk(61800),
      untracked: tk(1800),
      saving: tk(30000),
      netWorth: tk(60000),
    });
  });

  it('counts net worth from the theoretical balance when nothing was counted', () => {
    const snapshot = computeDashboard({
      monthKey: '2026-09',
      incomes: [income(tk(1000), at(2026, 9, 1))],
      expenses: [],
      loans: [loan('BORROWED', tk(400), at(2026, 9, 2))],
      summaries: [],
      baseOpening: tk(500),
      practical: null,
    });
    // 500 + 1,000 + 400 borrowed = 1,900 in hand; minus the 400 owed.
    expect(snapshot).toMatchObject({ theoretical: tk(1900), untracked: 0, saving: tk(1000), netWorth: tk(1500) });
  });
});

describe('recentDaySpends', () => {
  it('returns one slot per day oldest first, with empty days at zero', () => {
    const days = recentDaySpends([], '2026-09-17', 7);
    expect(days.map((d) => d.day)).toEqual([
      '2026-09-11',
      '2026-09-12',
      '2026-09-13',
      '2026-09-14',
      '2026-09-15',
      '2026-09-16',
      '2026-09-17',
    ]);
    expect(days.every((d) => d.total === 0)).toBe(true);
  });

  it('adds up a day, spans the month boundary and ignores what falls outside the window', () => {
    const rows = [
      expense(tk(200), at(2026, 10, 1, 9)),
      expense(tk(50), at(2026, 10, 1, 20)),
      expense(tk(300), at(2026, 9, 30)),
      expense(tk(900), at(2026, 9, 20)), // older than the window
    ];
    const days = recentDaySpends(rows, '2026-10-01', 3);
    expect(days).toEqual([
      { day: '2026-09-29', total: 0 },
      { day: '2026-09-30', total: tk(300) },
      { day: '2026-10-01', total: tk(250) },
    ]);
  });

  it('leaves out deleted expenses', () => {
    const rows = [expense(tk(100), at(2026, 9, 17)), expense(tk(400), at(2026, 9, 17), { isDeleted: true })];
    expect(recentDaySpends(rows, '2026-09-17', 1)).toEqual([{ day: '2026-09-17', total: tk(100) }]);
  });
});
