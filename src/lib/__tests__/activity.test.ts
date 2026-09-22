import { describe, expect, it } from '@jest/globals';

import { categorySet } from '@/constants/categories';
import { buildActivities, dayLabel, filterActivities, groupByDay, type Activity } from '@/lib/activity';
import { dayKeyToIso, dayMonth, fullDate, weekday } from '@/lib/date';
import { at, category, expense, income, loan, tk } from '@/test/factories';

const titles = (list: Activity[]) => list.map((i) => i.title);

describe('buildActivities', () => {
  it('lists live records newest first with signed amounts', () => {
    const items = buildActivities(
      [income(tk(5000), at(2026, 9, 1))],
      [expense(tk(120), at(2026, 9, 3, 9)), expense(tk(80), at(2026, 9, 3, 20), { isDeleted: true })],
      [loan('LENT', tk(1000), at(2026, 9, 2), { status: 'SETTLED', settledDate: at(2026, 9, 5) })],
    );
    expect(items.map((i) => [i.kind, i.amount])).toEqual([
      ['expense', -tk(120)],
      ['lent', tk(1000)],
      ['income', tk(5000)],
    ]);
    expect(items[1].settled).toBe(true);
  });

  it('names entries filed under a category the user added', () => {
    const snacks = category('EXPENSE', 'নাস্তা');
    const tuition = category('INCOME', 'টিউশন');
    const items = buildActivities(
      [income(tk(3000), at(2026, 9, 2), { source: tuition.id })],
      [expense(tk(120), at(2026, 9, 3), { category: snacks.id })],
      [],
      [snacks, tuition],
    );
    expect(items.map((i) => i.title)).toEqual(['নাস্তা', 'টিউশন']);
    expect(items[0].searchText).toContain('নাস্তা');
  });

  it('falls back to অন্যান্য when the categories are not loaded', () => {
    const snacks = category('EXPENSE', 'নাস্তা');
    const [item] = buildActivities([], [expense(tk(120), at(2026, 9, 3), { category: snacks.id })], []);
    expect(item.title).toBe(categorySet('EXPENSE').meta('others').label);
  });
});

describe('groupByDay', () => {
  it('groups by local day with the day income and expense, loans left out', () => {
    const days = groupByDay(
      buildActivities(
        [income(tk(500), at(2026, 9, 3, 10))],
        [expense(tk(120), at(2026, 9, 3, 9)), expense(tk(30), at(2026, 9, 3, 23, 30)), expense(tk(45), at(2026, 9, 2, 0, 15))],
        [loan('BORROWED', tk(900), at(2026, 9, 3, 12))],
      ),
    );
    expect(days.map((d) => [d.day, d.items.length, d.income, d.expense])).toEqual([
      ['2026-09-03', 4, tk(500), tk(150)],
      ['2026-09-02', 1, 0, tk(45)],
    ]);
  });
});

describe('filterActivities', () => {
  const items = buildActivities(
    [income(tk(5000), at(2026, 9, 1), { source: 'freelance' })],
    [
      expense(tk(450), at(2026, 9, 3), { category: 'transport', description: 'রিকশা' }),
      expense(tk(1250), at(2026, 8, 20), { category: 'food' }),
    ],
    [loan('LENT', tk(2000), at(2026, 9, 2), { personName: 'রহিম' })],
  );
  const expenses = categorySet('EXPENSE');
  const food = expenses.meta('food').label;

  it('filters by type, category and month', () => {
    expect(titles(filterActivities(items, { type: 'expense' }))).toEqual(['রিকশা', food]);
    expect(titles(filterActivities(items, { type: 'expense', category: 'food' }))).toEqual([food]);
    expect(titles(filterActivities(items, { type: 'income' }))).toEqual([
      categorySet('INCOME').find('freelance')?.label,
    ]);
    expect(titles(filterActivities(items, { type: 'loan' }))).toEqual(['রহিম']);
    expect(filterActivities(items, { monthKey: '2026-09' })).toHaveLength(3);
  });

  it('searches names, notes, categories and amounts, with Bangla digits too', () => {
    expect(titles(filterActivities(items, { text: 'রহিম' }))).toEqual(['রহিম']);
    expect(titles(filterActivities(items, { text: expenses.meta('transport').label }))).toEqual(['রিকশা']);
    expect(titles(filterActivities(items, { text: 'FOOD' }))).toEqual([food]);
    expect(titles(filterActivities(items, { text: '১২৫০' }))).toEqual([food]);
    expect(titles(filterActivities(items, { text: '1,250' }))).toEqual([food]);
    expect(filterActivities(items, { text: 'রিকশা 999' })).toHaveLength(0);
  });
});

describe('dayLabel', () => {
  const label = (day: string) => `${dayMonth(dayKeyToIso(day))} · ${weekday(dayKeyToIso(day))}`;

  it('names today and yesterday, and adds the year only for another year', () => {
    expect(dayLabel('2026-09-15', '2026-09-15')).toBe('আজ');
    expect(dayLabel('2026-09-14', '2026-09-15')).toBe('গতকাল');
    expect(dayLabel('2025-12-31', '2026-01-01')).toBe('গতকাল');
    expect(dayLabel('2026-09-10', '2026-09-15')).toBe(label('2026-09-10'));
    expect(dayLabel('2025-12-20', '2026-01-02')).toBe(
      `${fullDate(dayKeyToIso('2025-12-20'))} · ${weekday(dayKeyToIso('2025-12-20'))}`,
    );
  });
});
