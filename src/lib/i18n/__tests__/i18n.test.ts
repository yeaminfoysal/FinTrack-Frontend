import { afterEach, describe, expect, it } from '@jest/globals';

import bn from '@/lib/i18n/bn';
import en from '@/lib/i18n/en';
import { DEFAULT_LANG, getLanguage, LANGUAGES, resetLanguageForTests, setLanguage, strings, stringsFor } from '@/lib/i18n';
import { dueLabel } from '@/lib/loan-due';
import { frequencyLabel } from '@/lib/calc/recurring';
import { monthLabel, weekday } from '@/lib/date';

afterEach(() => {
  setLanguage(DEFAULT_LANG);
  resetLanguageForTests();
});

/** Walks both catalogues together, so a key that exists in one and not the other shows up. */
function comparePaths(a: unknown, b: unknown, path: string, report: string[]): void {
  if (typeof a === 'function') {
    if (typeof b !== 'function') report.push(`${path}: function in bn, ${typeof b} in en`);
    return;
  }
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) report.push(`${path}: array in bn, ${typeof b} in en`);
    else if (a.length !== b.length) report.push(`${path}: ${a.length} items in bn, ${b.length} in en`);
    return;
  }
  if (a !== null && typeof a === 'object') {
    const left = a as Record<string, unknown>;
    const right = (b ?? {}) as Record<string, unknown>;
    for (const key of Object.keys(left)) {
      if (!(key in right)) report.push(`${path}${path ? '.' : ''}${key}: missing in en`);
      else comparePaths(left[key], right[key], `${path}${path ? '.' : ''}${key}`, report);
    }
    for (const key of Object.keys(right)) {
      if (!(key in left)) report.push(`${path}${path ? '.' : ''}${key}: missing in bn`);
    }
    return;
  }
  if (typeof b !== typeof a) report.push(`${path}: ${typeof a} in bn, ${typeof b} in en`);
}

describe('catalogues', () => {
  it('have exactly the same shape', () => {
    const report: string[] = [];
    comparePaths(bn, en, '', report);
    expect(report).toEqual([]);
  });

  it('have no blank strings', () => {
    const blanks: string[] = [];
    const walk = (value: unknown, path: string) => {
      if (typeof value === 'string') {
        // A couple of phrase fragments are deliberately empty in one language.
        if (value === '' && !path.endsWith('trendPrefix') && !path.endsWith('trendSuffix')) blanks.push(path);
      } else if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}[${i}]`));
      else if (value !== null && typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) walk(v, `${path}${path ? '.' : ''}${k}`);
      }
    };
    for (const lang of LANGUAGES) walk(stringsFor(lang), lang);
    expect(blanks).toEqual([]);
  });
});

describe('language', () => {
  it('starts on Bangla', () => {
    expect(getLanguage()).toBe('bn');
    expect(strings()).toBe(bn);
  });

  it('switches the catalogue', () => {
    setLanguage('en');
    expect(getLanguage()).toBe('en');
    expect(strings()).toBe(en);
  });

  it('carries through the helpers that format dates and labels', () => {
    const iso = '2026-09-12T10:00:00.000Z';
    expect(monthLabel('2026-09')).toBe('সেপ্টেম্বর 2026');
    expect(weekday(iso)).toBe(bn.date.weekdays[new Date(iso).getDay()]);
    expect(frequencyLabel({ frequency: 'DAILY', anchor: 0 })).toBe('প্রতিদিন');
    expect(dueLabel({ day: '2026-09-12', daysLeft: 0, overdue: false, soon: true })).toBe('আজ ফেরতের দিন');

    setLanguage('en');
    expect(monthLabel('2026-09')).toBe('September 2026');
    expect(weekday(iso)).toBe(en.date.weekdays[new Date(iso).getDay()]);
    expect(frequencyLabel({ frequency: 'DAILY', anchor: 0 })).toBe('Every day');
    expect(dueLabel({ day: '2026-09-12', daysLeft: 0, overdue: false, soon: true })).toBe('Due back today');
  });
});
