import type { DataSlice, IncomeActions } from '@/features/data-state';
import { recordActions } from '@/features/records/record-actions';
import { writeMeta } from '@/features/storage/persist';
import { incomeCashEvents } from '@/lib/calc/practical';
import { upsertIncome } from '@/lib/db/repo';
import { newBase, nowIso } from '@/lib/records';
import type { Income } from '@/lib/types';

export const createIncomeSlice: DataSlice<IncomeActions> = (set) => {
  const incomes = recordActions<Income>(set, { list: 'incomes', save: upsertIncome, cashEvents: incomeCashEvents });

  return {
    addIncome: (input) => {
      const rec: Income = {
        ...newBase(),
        amount: input.amount,
        source: input.source,
        date: input.date ?? nowIso(),
        note: input.note ?? null,
      };
      incomes.add(rec, { lastIncomeSource: rec.source });
      writeMeta('lastIncomeSource', rec.source);
      return rec.id;
    },
    updateIncome: incomes.update,
    deleteIncome: incomes.remove,
    restoreIncome: incomes.restore,
  };
};
