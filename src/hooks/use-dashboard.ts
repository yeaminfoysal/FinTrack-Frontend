import { useMemo } from 'react';

import { categoryMeta, INCOME_SOURCES } from '@/constants/categories';
import { computeDashboard, type DashboardSnapshot } from '@/lib/calc';
import { dayMonthBn, type MonthKey } from '@/lib/date';
import { useDataStore } from '@/stores/data';

export type ActivityKind = 'income' | 'expense' | 'lent' | 'borrowed';

export interface Activity {
  id: string;
  kind: ActivityKind;
  icon: string;
  title: string;
  subtitle: string;
  amount: number; // signed paisa for display
  date: string;
}

function incomeLabel(source: string): string {
  return INCOME_SOURCES.find((s) => s.key === source)?.label ?? 'আয়';
}

export function useDashboard(monthKeyArg?: MonthKey): {
  snapshot: DashboardSnapshot;
  recent: Activity[];
  profile: ReturnType<typeof useDataStore.getState>['profile'];
  monthKey: MonthKey;
} {
  const storeMonthKey = useDataStore((s) => s.monthKey);
  const monthKey = monthKeyArg ?? storeMonthKey;
  const incomes = useDataStore((s) => s.incomes);
  const expenses = useDataStore((s) => s.expenses);
  const loans = useDataStore((s) => s.loans);
  const summaries = useDataStore((s) => s.summaries);
  const practicals = useDataStore((s) => s.practicals);
  const profile = useDataStore((s) => s.profile);

  const snapshot = useMemo(
    () =>
      computeDashboard({
        monthKey,
        incomes,
        expenses,
        loans,
        summaries,
        baseOpening: profile.openingSavings,
        practical: practicals[monthKey]?.amount ?? null,
      }),
    [monthKey, incomes, expenses, loans, summaries, practicals, profile.openingSavings],
  );

  const recent = useMemo<Activity[]>(() => {
    const items: Activity[] = [];
    incomes
      .filter((i) => !i.isDeleted)
      .forEach((i) =>
        items.push({
          id: i.id,
          kind: 'income',
          icon: '↓',
          title: i.note || incomeLabel(i.source),
          subtitle: `আয় · ${dayMonthBn(i.date)}`,
          amount: i.amount,
          date: i.date,
        }),
      );
    expenses
      .filter((e) => !e.isDeleted)
      .forEach((e) => {
        const meta = categoryMeta(e.category);
        items.push({
          id: e.id,
          kind: 'expense',
          icon: meta.icon,
          title: e.description || meta.label,
          subtitle: `খরচ · ${meta.en} · ${dayMonthBn(e.date)}`,
          amount: -e.amount,
          date: e.date,
        });
      });
    loans
      .filter((l) => !l.isDeleted)
      .forEach((l) =>
        items.push({
          id: l.id,
          kind: l.direction === 'LENT' ? 'lent' : 'borrowed',
          icon: l.direction === 'LENT' ? '↗' : '↙',
          title: l.direction === 'LENT' ? `${l.personName}কে ধার` : `${l.personName} থেকে ধার`,
          subtitle: `${l.direction === 'LENT' ? 'Lent' : 'Borrowed'} · ${l.status === 'ACTIVE' ? 'Active' : 'Settled'} · ${dayMonthBn(l.date)}`,
          amount: l.amount,
          date: l.date,
        }),
      );
    return items.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);
  }, [incomes, expenses, loans]);

  return { snapshot, recent, profile, monthKey };
}
