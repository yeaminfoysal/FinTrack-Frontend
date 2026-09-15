import { useMemo } from 'react';

import type { IconName } from '@/components/ui/icon';
import { categoryMeta, incomeSourceMeta } from '@/constants/categories';
import { computeDashboard, type DashboardSnapshot } from '@/lib/calc';
import { dayMonthBn, type MonthKey } from '@/lib/date';
import { useDataStore } from '@/stores/data';

export type ActivityKind = 'income' | 'expense' | 'lent' | 'borrowed';

export interface Activity {
  id: string;
  kind: ActivityKind;
  icon: IconName;
  title: string;
  subtitle: string;
  amount: number; // signed paisa for display
  date: string;
  createdAt: string;
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
    for (const i of incomes) {
      if (i.isDeleted) continue;
      const source = incomeSourceMeta(i.source);
      items.push({
        id: i.id,
        kind: 'income',
        icon: source?.iconName ?? 'arrow-down',
        title: i.note || source?.label || 'আয়',
        subtitle: `${i.note && source ? source.label : 'আয়'} · ${dayMonthBn(i.date)}`,
        amount: i.amount,
        date: i.date,
        createdAt: i.createdAt,
      });
    }
    for (const e of expenses) {
      if (e.isDeleted) continue;
      const meta = categoryMeta(e.category);
      items.push({
        id: e.id,
        kind: 'expense',
        icon: meta.iconName,
        title: e.description || meta.label,
        subtitle: `${e.description ? meta.label : 'খরচ'} · ${dayMonthBn(e.date)}`,
        amount: -e.amount,
        date: e.date,
        createdAt: e.createdAt,
      });
    }
    for (const l of loans) {
      if (l.isDeleted) continue;
      const lent = l.direction === 'LENT';
      const status = l.status === 'ACTIVE' ? 'চলমান' : lent ? 'ফেরত পাওয়া' : 'শোধ করা';
      items.push({
        id: l.id,
        kind: lent ? 'lent' : 'borrowed',
        icon: lent ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline',
        title: l.personName,
        subtitle: `${lent ? 'ধার দেওয়া' : 'ধার নেওয়া'} · ${status} · ${dayMonthBn(l.date)}`,
        amount: l.amount,
        date: l.date,
        createdAt: l.createdAt,
      });
    }
    return items
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6);
  }, [incomes, expenses, loans]);

  return { snapshot, recent, profile, monthKey };
}
