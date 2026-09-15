import { describe, expect, it } from '@jest/globals';

import {
  adjustPracticals,
  expenseCashEvents,
  incomeCashEvents,
  isAfterCount,
  loanCashEvents,
} from '@/lib/calc/practical';
import { at, counted, expense, income, loan, tk } from '@/test/factories';

const NOW = at(2026, 9, 15, 21);
/** ৳9,500 counted in hand on 10 September at 21:00. */
const september = () => ({ '2026-09': counted('2026-09', tk(9500), at(2026, 9, 10, 21)) });

describe('isAfterCount', () => {
  const countedAt = at(2026, 9, 10, 21);

  it('compares days, and on the count day compares when the entry was written down', () => {
    expect(isAfterCount({ date: at(2026, 9, 8), loggedAt: at(2026, 9, 12), delta: -1 }, countedAt)).toBe(false);
    expect(isAfterCount({ date: at(2026, 9, 11), loggedAt: at(2026, 9, 11), delta: -1 }, countedAt)).toBe(true);
    expect(isAfterCount({ date: at(2026, 9, 10), loggedAt: at(2026, 9, 10, 9), delta: -1 }, countedAt)).toBe(false);
    expect(isAfterCount({ date: at(2026, 9, 10), loggedAt: at(2026, 9, 10, 22), delta: -1 }, countedAt)).toBe(true);
  });
});

describe('adjustPracticals', () => {
  it('leaves the count alone for a forgotten expense from before it, so the untracked gap closes', () => {
    // Spent on the 8th, written down on the 12th: the ৳500 was already gone when the cash was counted.
    const rickshaw = expense(tk(500), at(2026, 9, 8), { createdAt: at(2026, 9, 12) });
    expect(adjustPracticals(september(), [], expenseCashEvents(rickshaw), NOW)).toEqual([]);
  });

  it('moves cash for an entry after the count and marks the balance for upload', () => {
    const tea = expense(tk(20), at(2026, 9, 12), { createdAt: at(2026, 9, 12, 18) });
    expect(adjustPracticals(september(), [], expenseCashEvents(tea), NOW)).toEqual([
      {
        monthKey: '2026-09',
        cash: tk(9480),
        bank: 0,
        mfs: 0,
        amount: tk(9480),
        countedAt: at(2026, 9, 10, 21),
        updatedAt: NOW,
        syncStatus: 'PENDING',
      },
    ]);
  });

  it('undoes exactly what it applied when the entry is edited or deleted', () => {
    const bonus = income(tk(1000), at(2026, 9, 12));
    const [afterAdd] = adjustPracticals(september(), [], incomeCashEvents(bonus), NOW);
    expect(afterAdd.amount).toBe(tk(10500));

    const raised = { ...bonus, amount: tk(1200) };
    expect(adjustPracticals({ '2026-09': afterAdd }, incomeCashEvents(bonus), incomeCashEvents(raised), NOW)[0].amount).toBe(
      tk(10700),
    );
    expect(adjustPracticals({ '2026-09': afterAdd }, incomeCashEvents(bonus), [], NOW)[0].amount).toBe(tk(9500));
  });

  it('writes nothing when an edit keeps the money the same', () => {
    const groceries = expense(tk(300), at(2026, 9, 12));
    const renamed = { ...groceries, description: 'বাজার' };
    expect(adjustPracticals(september(), expenseCashEvents(groceries), expenseCashEvents(renamed), NOW)).toEqual([]);
  });

  it('moves the effect to the other month when the date changes months', () => {
    const practicals = {
      '2026-08': counted('2026-08', tk(4000), at(2026, 8, 1, 8)),
      '2026-09': counted('2026-09', tk(9500), at(2026, 9, 1, 8)),
    };
    const bill = expense(tk(250), at(2026, 9, 3));
    const moved = { ...bill, date: at(2026, 8, 20) };

    const changed = adjustPracticals(practicals, expenseCashEvents(bill), expenseCashEvents(moved), NOW);

    expect(Object.fromEntries(changed.map((p) => [p.monthKey, p.amount]))).toEqual({
      '2026-08': tk(3750),
      '2026-09': tk(9750),
    });
  });

  it('brings lent money back in the month it is returned, not the month it was lent', () => {
    const practicals = {
      '2026-08': counted('2026-08', tk(4000), at(2026, 8, 1, 8)),
      '2026-09': counted('2026-09', tk(9500), at(2026, 9, 1, 8)),
    };
    const lent = loan('LENT', tk(2000), at(2026, 8, 10));
    const returned = { ...lent, status: 'SETTLED' as const, settledDate: at(2026, 9, 5, 18) };

    const changed = adjustPracticals(practicals, loanCashEvents(lent), loanCashEvents(returned), NOW);

    expect(changed.map((p) => [p.monthKey, p.amount])).toEqual([['2026-09', tk(11500)]]);
  });

  it('ignores months without a counted balance', () => {
    expect(adjustPracticals({}, [], expenseCashEvents(expense(tk(100), at(2026, 9, 12))), NOW)).toEqual([]);
  });
});

describe('loanCashEvents', () => {
  it('borrowing brings cash in and repaying takes it out; deleted loans move nothing', () => {
    const borrowed = loan('BORROWED', tk(700), at(2026, 9, 2));
    expect(loanCashEvents(borrowed).map((e) => e.delta)).toEqual([tk(700)]);
    expect(
      loanCashEvents({ ...borrowed, status: 'SETTLED', settledDate: at(2026, 9, 9) }).map((e) => e.delta),
    ).toEqual([tk(700), -tk(700)]);
    expect(loanCashEvents({ ...borrowed, isDeleted: true })).toEqual([]);
  });
});
