import { describe, expect, it } from '@jest/globals';

import { planDailyReminders, planLoanReminders, timeLabelBn, type ReminderSettings } from '@/lib/notifications';
import { at, loan, loanPayment, tk } from '@/test/factories';

const ON: ReminderSettings = { dailyEnabled: true, dailyMinutes: 21 * 60, loanDueEnabled: true };
/** Midday on 17 September, so the 9 pm reminder is still ahead. */
const NOW = new Date(2026, 8, 17, 12, 0, 0);
const TODAY = '2026-09-17';

describe('planDailyReminders', () => {
  it('fills the week ahead when nothing has been written today', () => {
    const planned = planDailyReminders(ON, false, TODAY, NOW);
    expect(planned).toHaveLength(7);
    expect(planned[0].at).toEqual(new Date(2026, 8, 17, 21, 0, 0));
    expect(planned[6].at).toEqual(new Date(2026, 8, 23, 21, 0, 0));
  });

  it('skips today once an expense is in, so the nudge is never pointless', () => {
    const planned = planDailyReminders(ON, true, TODAY, NOW);
    expect(planned).toHaveLength(6);
    expect(planned[0].at).toEqual(new Date(2026, 8, 18, 21, 0, 0));
  });

  it('skips a time that has already passed today', () => {
    const lateNight = new Date(2026, 8, 17, 23, 0, 0);
    expect(planDailyReminders(ON, false, TODAY, lateNight)[0].at).toEqual(new Date(2026, 8, 18, 21, 0, 0));
  });

  it('plans nothing while switched off', () => {
    expect(planDailyReminders({ ...ON, dailyEnabled: false }, false, TODAY, NOW)).toEqual([]);
  });
});

describe('planLoanReminders', () => {
  it('reminds on the due day of a loan that is still outstanding', () => {
    const lent = loan('LENT', tk(5000), at(2026, 9, 1), { dueDate: at(2026, 9, 20), personName: 'করিম' });
    const [planned] = planLoanReminders(ON, [lent], [], TODAY, NOW);
    expect(planned.at).toEqual(new Date(2026, 8, 20, 10, 0, 0));
    expect(planned.body).toContain('করিম');
  });

  it('counts only what is left after repayments', () => {
    const lent = loan('LENT', tk(5000), at(2026, 9, 1), { dueDate: at(2026, 9, 20) });
    const [planned] = planLoanReminders(ON, [lent], [loanPayment(lent.id, tk(2000), at(2026, 9, 10))], TODAY, NOW);
    expect(planned.body).toContain('3,000');
  });

  it('leaves out settled, deleted, dateless and overdue loans', () => {
    const due = at(2026, 9, 20);
    const loans = [
      loan('LENT', tk(1000), at(2026, 9, 1), { dueDate: due, status: 'SETTLED', settledDate: at(2026, 9, 5) }),
      loan('LENT', tk(1000), at(2026, 9, 1), { dueDate: due, isDeleted: true }),
      loan('LENT', tk(1000), at(2026, 9, 1)),
      loan('LENT', tk(1000), at(2026, 9, 1), { dueDate: at(2026, 9, 10) }), // already past
    ];
    expect(planLoanReminders(ON, loans, [], TODAY, NOW)).toEqual([]);
  });

  it('plans nothing while switched off', () => {
    const lent = loan('LENT', tk(5000), at(2026, 9, 1), { dueDate: at(2026, 9, 20) });
    expect(planLoanReminders({ ...ON, loanDueEnabled: false }, [lent], [], TODAY, NOW)).toEqual([]);
  });
});

describe('timeLabelBn', () => {
  it('names the part of the day', () => {
    expect(timeLabelBn(18 * 60)).toContain('সন্ধ্যা');
    expect(timeLabelBn(21 * 60)).toContain('রাত');
    expect(timeLabelBn(9 * 60)).toContain('সকাল');
  });
});
