import type { DataSlice, ExpenseActions } from '@/features/data-state';
import { recordActions } from '@/features/records/record-actions';
import { writeMeta } from '@/features/storage/persist';
import { expenseCashEvents } from '@/lib/calc/practical';
import { upsertExpense } from '@/lib/db/repo';
import { newBase, nowIso } from '@/lib/records';
import type { Expense } from '@/lib/types';

export const createExpenseSlice: DataSlice<ExpenseActions> = (set) => {
  const expenses = recordActions<Expense>(set, { list: 'expenses', save: upsertExpense, cashEvents: expenseCashEvents });

  return {
    addExpense: (input) => {
      const rec: Expense = {
        ...newBase(),
        // A recurring occurrence brings its own id, so the same one on another device is one row.
        ...(input.id ? { id: input.id } : {}),
        amount: input.amount,
        category: input.category,
        date: input.date ?? nowIso(),
        description: input.description ?? null,
      };
      expenses.add(rec, { lastExpenseCategory: rec.category });
      writeMeta('lastExpenseCategory', rec.category);
      return rec.id;
    },
    updateExpense: expenses.update,
    deleteExpense: expenses.remove,
    restoreExpense: expenses.restore,
  };
};
