import { describe, expect, it } from '@jest/globals';

import { monthDailyExpense } from '@/lib/calc';
import { byMonth, rowsInMonth } from '@/lib/calc/month-index';
import { at, expense, tk } from '@/test/factories';

describe('byMonth', () => {
  it('groups live rows by local month and skips deleted ones', () => {
    const rows = [
      expense(tk(10), at(2026, 9, 30, 23, 59)),
      expense(tk(20), at(2026, 10, 1, 0, 1)),
      expense(tk(30), at(2026, 9, 2), { isDeleted: true }),
    ];
    expect([...byMonth(rows).keys()].sort()).toEqual(['2026-09', '2026-10']);
    expect(rowsInMonth(rows, '2026-09').map((e) => e.amount)).toEqual([tk(10)]);
    expect(rowsInMonth(rows, '2026-11')).toEqual([]);
  });

  it('builds the index once per array and again for a replaced array', () => {
    const rows = [expense(tk(10), at(2026, 9, 1))];
    expect(byMonth(rows)).toBe(byMonth(rows));

    const replaced = [...rows, expense(tk(5), at(2026, 9, 2))];
    expect(byMonth(replaced)).not.toBe(byMonth(rows));
    expect(monthDailyExpense(replaced, '2026-09')).toBe(tk(15));
    expect(monthDailyExpense(rows, '2026-09')).toBe(tk(10));
  });
});
