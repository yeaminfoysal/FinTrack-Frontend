/**
 * Keeps the scheduled reminders in step with the settings and the data they describe.
 * Reschedules whenever something that changes the plan changes — the settings, whether
 * today already has an expense, or which loans are still due.
 */
import { useEffect, useMemo } from 'react';

import { recentDaySpends } from '@/lib/calc';
import { todayKey } from '@/lib/date';
import { rescheduleReminders } from '@/lib/notifications';
import { useDataStore } from '@/stores/data';
import { useRemindersStore } from '@/stores/reminders';

export function useReminders(): void {
  const load = useRemindersStore((s) => s.load);
  const dailyEnabled = useRemindersStore((s) => s.dailyEnabled);
  const dailyMinutes = useRemindersStore((s) => s.dailyMinutes);
  const loanDueEnabled = useRemindersStore((s) => s.loanDueEnabled);
  const loaded = useRemindersStore((s) => s.loaded);

  const ready = useDataStore((s) => s.ready);
  const expenses = useDataStore((s) => s.expenses);
  const loans = useDataStore((s) => s.loans);
  const payments = useDataStore((s) => s.loanPayments);

  useEffect(() => {
    load();
  }, [load]);

  // Only the first expense of the day changes the plan, so the effect watches the fact,
  // not the list — otherwise every edit would rewrite the whole schedule.
  const loggedToday = useMemo(() => recentDaySpends(expenses, todayKey(), 1)[0].total > 0, [expenses]);
  // Same idea for loans: a rename doesn't move a due date.
  const dueSignature = useMemo(
    () =>
      loans
        .filter((l) => !l.isDeleted && l.dueDate != null)
        .map((l) => `${l.id}:${l.dueDate}`)
        .sort()
        .join('|'),
    [loans],
  );

  useEffect(() => {
    if (!ready || !loaded) return;
    void rescheduleReminders({
      settings: { dailyEnabled, dailyMinutes, loanDueEnabled },
      loggedToday,
      loans: useDataStore.getState().loans,
      payments: useDataStore.getState().loanPayments,
    });
    // Loans and payments are read fresh above rather than watched: a rename or a note
    // doesn't change a single reminder, and the due signature catches what does.
  }, [ready, loaded, dailyEnabled, dailyMinutes, loanDueEnabled, loggedToday, dueSignature, payments]);
}
