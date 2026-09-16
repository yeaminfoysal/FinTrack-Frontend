import { describe, expect, it } from '@jest/globals';

import { computeDashboard } from '@/lib/calc';
import { buildMonthReportHtml } from '@/lib/report-html';
import { at, category, expense, income, tk } from '@/test/factories';

const MONTH = '2026-09';

const rent = category('EXPENSE', 'বাসা ভাড়া', { icon: '🏠', iconName: 'home-outline' });
const tuition = category('INCOME', 'টিউশন', { icon: '📖', iconName: 'book-outline' });

const incomes = [income(tk(3000), at(2026, 9, 2), { source: tuition.id })];
const expenses = [expense(tk(12000), at(2026, 9, 3), { category: rent.id })];

function html(categories?: typeof rent[]) {
  return buildMonthReportHtml({
    monthKey: MONTH,
    snapshot: computeDashboard({
      monthKey: MONTH,
      incomes,
      expenses,
      loans: [],
      summaries: [],
      baseOpening: 0,
      practical: null,
    }),
    incomes,
    expenses,
    loans: [],
    categories,
    userName: 'রাফিদ',
  });
}

describe('buildMonthReportHtml', () => {
  it('names custom categories and sources, with their emoji', () => {
    const out = html([rent, tuition]);
    expect(out).toContain('🏠 বাসা ভাড়া');
    expect(out).toContain('📖 টিউশন');
  });

  it('still names a category the user has since deleted', () => {
    const out = html([{ ...rent, isDeleted: true }, tuition]);
    expect(out).toContain('বাসা ভাড়া');
  });

  it('falls back to অন্যান্য when the categories are not passed in', () => {
    const out = html();
    expect(out).not.toContain('বাসা ভাড়া');
    expect(out).toContain('অন্যান্য');
  });
});
