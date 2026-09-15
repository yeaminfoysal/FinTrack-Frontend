import { describe, expect, it } from '@jest/globals';

import { categoryTotals, monthDailyExpense } from '@/lib/calc';
import { monthsEndingAt } from '@/lib/date';
import { at, expense, tk } from '@/test/factories';

describe('categoryTotals', () => {
  it('sums one month per category, largest first, matching the month expense', () => {
    const expenses = [
      expense(tk(100), at(2026, 9, 1), { category: 'food' }),
      expense(tk(300), at(2026, 9, 2), { category: 'transport' }),
      expense(tk(50), at(2026, 9, 3), { category: 'food' }),
      expense(tk(999), at(2026, 8, 31, 23, 59), { category: 'food' }),
      expense(tk(70), at(2026, 9, 4), { category: 'food', isDeleted: true }),
    ];
    const totals = categoryTotals(expenses, '2026-09');
    expect(totals).toEqual([
      { category: 'transport', amount: tk(300) },
      { category: 'food', amount: tk(150) },
    ]);
    expect(totals.reduce((sum, c) => sum + c.amount, 0)).toBe(monthDailyExpense(expenses, '2026-09'));
  });
});

describe('monthsEndingAt', () => {
  it('returns the months up to the given one, oldest first, across a year change', () => {
    expect(monthsEndingAt('2026-02', 4)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
    expect(monthsEndingAt('2026-09', 1)).toEqual(['2026-09']);
  });
});
