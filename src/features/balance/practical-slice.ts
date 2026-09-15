/** The month's counted balance (cash + bank + MFS) and how entries keep it current. */
import type { DataSlice, DataState, PracticalActions } from '@/features/data-state';
import { withDb } from '@/features/storage/persist';
import { adjustPracticals, type CashEvent } from '@/lib/calc/practical';
import { upsertPractical } from '@/lib/db/repo';
import { nowIso } from '@/lib/records';
import type { PracticalBalance } from '@/lib/types';

/**
 * Practical balances after an entry's cash movements go from `before` to `after`
 * ([] for an entry that doesn't exist yet or is deleted). Only movements after a
 * month's count change it (see adjustPracticals); the changed balances are saved.
 */
export function practicalPatch(
  s: Pick<DataState, 'practicals'>,
  before: CashEvent[],
  after: CashEvent[],
): Partial<Pick<DataState, 'practicals'>> {
  const changed = adjustPracticals(s.practicals, before, after, nowIso());
  if (changed.length === 0) return {};
  withDb((db) => changed.forEach((p) => upsertPractical(db, p)));
  return { practicals: { ...s.practicals, ...Object.fromEntries(changed.map((p) => [p.monthKey, p])) } };
}

export const createPracticalSlice: DataSlice<PracticalActions> = (set) => ({
  setPractical: (monthKey, parts) => {
    const now = nowIso();
    const rec: PracticalBalance = {
      monthKey,
      cash: parts.cash,
      bank: parts.bank,
      mfs: parts.mfs,
      amount: parts.cash + parts.bank + parts.mfs,
      countedAt: now,
      updatedAt: now,
      syncStatus: 'PENDING',
    };
    set((s) => ({ practicals: { ...s.practicals, [monthKey]: rec } }));
    withDb((db) => upsertPractical(db, rec));
  },
});
