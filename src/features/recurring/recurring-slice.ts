/**
 * Standing entries (rent, salary, a bill) and the catch-up that turns the occurrences
 * they owe into ordinary incomes and expenses. There is no cron on a phone, so this runs
 * when the app opens and comes back to the foreground — the same approach as month-close.
 */
import type { AddRecurringInput, DataSlice, DataState, RecurringActions } from '@/features/data-state';
import { recordActions } from '@/features/records/record-actions';
import { dueOccurrences, occurrenceId } from '@/lib/calc/recurring';
import { dayKeyToIso, todayKey } from '@/lib/date';
import { upsertRecurring } from '@/lib/db/repo';
import { newBase, nowIso } from '@/lib/records';
import type { Recurring } from '@/lib/types';

export const createRecurringSlice: DataSlice<RecurringActions> = (set, get) => {
  // A rule is a template, never money of its own — so it moves no cash.
  const rules = recordActions<Recurring>(set, { list: 'recurrings', save: upsertRecurring, cashEvents: () => [] });

  return {
    addRecurring: (input: AddRecurringInput) => {
      const rec: Recurring = {
        ...newBase(),
        kind: input.kind,
        amount: input.amount,
        category: input.category,
        note: input.note ?? null,
        frequency: input.frequency,
        anchor: input.anchor,
        startDate: input.startDate ?? nowIso(),
        lastRunDay: null,
        isPaused: false,
      };
      rules.add(rec);
      return rec.id;
    },
    updateRecurring: rules.update,
    setRecurringPaused: (id, paused) =>
      rules.change(id, (r) => (r.isPaused === paused ? null : rules.stamp(r, { isPaused: paused }))),
    deleteRecurring: rules.remove,
    restoreRecurring: rules.restore,

    runRecurring: () => {
      const s = get();
      if (!s.ready) return 0;

      const today = todayKey();
      let written = 0;
      for (const rule of s.recurrings) {
        const days = dueOccurrences(rule, today);
        if (days.length === 0) continue;

        // Ids are derived from the rule and day, so an entry another device already wrote
        // (or one this user deleted) is recognised and left alone.
        const state: DataState = get();
        const taken = new Set((rule.kind === 'EXPENSE' ? state.expenses : state.incomes).map((row) => row.id));
        for (const day of days) {
          const id = occurrenceId(rule, day);
          if (taken.has(id)) continue;
          const date = dayKeyToIso(day);
          if (rule.kind === 'EXPENSE') {
            get().addExpense({ id, amount: rule.amount, category: rule.category, date, description: rule.note });
          } else {
            get().addIncome({ id, amount: rule.amount, source: rule.category, date, note: rule.note });
          }
          written += 1;
        }
        // Moves on even when every occurrence was already there, so the work isn't repeated.
        rules.change(rule.id, (r) => rules.stamp(r, { lastRunDay: days[days.length - 1] }));
      }
      return written;
    },
  };
};
