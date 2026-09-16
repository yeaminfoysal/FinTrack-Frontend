import { useMemo } from 'react';

import { buildActivities, type Activity } from '@/lib/activity';
import { computeDashboard, type DashboardSnapshot } from '@/lib/calc';
import type { MonthKey } from '@/lib/date';
import { useDataStore } from '@/stores/data';

/** How many of the latest entries Home shows. */
const RECENT_COUNT = 8;

/** Every live income, expense and loan as a display row, newest first. */
export function useActivities(): Activity[] {
  const incomes = useDataStore((s) => s.incomes);
  const expenses = useDataStore((s) => s.expenses);
  const loans = useDataStore((s) => s.loans);
  const categories = useDataStore((s) => s.categories);
  return useMemo(
    () => buildActivities(incomes, expenses, loans, categories),
    [incomes, expenses, loans, categories],
  );
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

  const activities = useActivities();
  const recent = useMemo(() => activities.slice(0, RECENT_COUNT), [activities]);

  return { snapshot, recent, profile, monthKey };
}
