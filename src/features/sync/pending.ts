import type { DataState } from '@/features/data-state';

/** Records the server hasn't confirmed yet — drives the sync badge and the logout warning. */
export function countPending(
  s: Pick<DataState, 'incomes' | 'expenses' | 'loans' | 'categories' | 'summaries' | 'practicals'>,
): number {
  const lists: { syncStatus: string }[][] = [
    s.incomes,
    s.expenses,
    s.loans,
    s.categories,
    s.summaries,
    Object.values(s.practicals),
  ];
  let pending = 0;
  for (const list of lists) {
    for (const record of list) if (record.syncStatus !== 'SYNCED') pending += 1;
  }
  return pending;
}
