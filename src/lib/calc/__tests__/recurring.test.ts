import { describe, expect, it } from '@jest/globals';

import { dueOccurrences, frequencyLabel, MAX_CATCH_UP, occurrenceId } from '@/lib/calc/recurring';
import { localDigits } from '@/lib/digits';
import { at, recurring, tk } from '@/test/factories';

describe('dueOccurrences', () => {
  it('runs a monthly rule on its day, and on the last day of a month too short for it', () => {
    const rule = recurring('EXPENSE', tk(12000), { frequency: 'MONTHLY', anchor: 31, startDate: at(2026, 1, 1) });
    expect(dueOccurrences(rule, '2026-03-31')).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
  });

  it('starts at startDate and never before it', () => {
    const rule = recurring('EXPENSE', tk(500), { frequency: 'MONTHLY', anchor: 1, startDate: at(2026, 3, 1) });
    expect(dueOccurrences(rule, '2026-04-10')).toEqual(['2026-03-01', '2026-04-01']);
  });

  it('carries on from the day it last ran, without repeating it', () => {
    const rule = recurring('INCOME', tk(55000), {
      frequency: 'MONTHLY',
      anchor: 1,
      startDate: at(2026, 1, 1),
      lastRunDay: '2026-02-01',
    });
    expect(dueOccurrences(rule, '2026-04-05')).toEqual(['2026-03-01', '2026-04-01']);
  });

  it('gives nothing when it has already run for today', () => {
    const rule = recurring('EXPENSE', tk(100), { frequency: 'DAILY', startDate: at(2026, 3, 1), lastRunDay: '2026-03-10' });
    expect(dueOccurrences(rule, '2026-03-10')).toEqual([]);
  });

  it('matches the weekday for a weekly rule', () => {
    // 2026-03-06 is a Friday.
    const rule = recurring('EXPENSE', tk(2000), { frequency: 'WEEKLY', anchor: 5, startDate: at(2026, 3, 1) });
    expect(dueOccurrences(rule, '2026-03-20')).toEqual(['2026-03-06', '2026-03-13', '2026-03-20']);
  });

  it('gives every day for a daily rule, today included', () => {
    const rule = recurring('EXPENSE', tk(50), { frequency: 'DAILY', startDate: at(2026, 3, 1) });
    expect(dueOccurrences(rule, '2026-03-04')).toEqual(['2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04']);
  });

  it('stops at the catch-up cap for a rule left alone for years', () => {
    const rule = recurring('EXPENSE', tk(50), { frequency: 'DAILY', startDate: at(2020, 1, 1) });
    expect(dueOccurrences(rule, '2026-03-04')).toHaveLength(MAX_CATCH_UP);
  });

  it('generates nothing while paused or deleted', () => {
    const base = { frequency: 'DAILY' as const, startDate: at(2026, 3, 1) };
    expect(dueOccurrences(recurring('EXPENSE', tk(50), { ...base, isPaused: true }), '2026-03-04')).toEqual([]);
    expect(dueOccurrences(recurring('EXPENSE', tk(50), { ...base, isDeleted: true }), '2026-03-04')).toEqual([]);
  });

  it('gives nothing before the rule starts', () => {
    const rule = recurring('EXPENSE', tk(50), { frequency: 'DAILY', startDate: at(2026, 5, 1) });
    expect(dueOccurrences(rule, '2026-03-04')).toEqual([]);
  });
});

describe('occurrenceId', () => {
  const rule = recurring('EXPENSE', tk(12000), { frequency: 'MONTHLY', anchor: 1, startDate: at(2026, 1, 1) });

  it('is the same every time, so two devices write one row instead of two', () => {
    expect(occurrenceId(rule, '2026-03-01')).toBe(occurrenceId(rule, '2026-03-01'));
  });

  it('differs per day and per rule', () => {
    const other = recurring('EXPENSE', tk(12000), { frequency: 'MONTHLY', anchor: 1, startDate: at(2026, 1, 1) });
    expect(occurrenceId(rule, '2026-03-01')).not.toBe(occurrenceId(rule, '2026-04-01'));
    expect(occurrenceId(rule, '2026-03-01')).not.toBe(occurrenceId(other, '2026-03-01'));
  });

  it('looks like a v4 UUID, which is what the server accepts', () => {
    expect(occurrenceId(rule, '2026-03-01')).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe('frequencyLabel', () => {
  it('says how often in one phrase', () => {
    expect(frequencyLabel({ frequency: 'DAILY', anchor: 0 })).toBe('প্রতিদিন');
    expect(frequencyLabel({ frequency: 'WEEKLY', anchor: 5 })).toBe('প্রতি শুক্রবার');
    // The day goes through localDigits, so it follows whatever numeral system the app shows.
    expect(frequencyLabel({ frequency: 'MONTHLY', anchor: 1 })).toBe(`প্রতি মাসের ${localDigits(1)} তারিখে`);
  });
});
