import { describe, expect, it } from '@jest/globals';

import { formatTaka, sanitizeAmountInput, toPaisa } from '@/lib/money';

describe('toPaisa', () => {
  it('parses taka into integer paisa without float drift', () => {
    expect(toPaisa('1250.50')).toBe(125050);
    expect(toPaisa('19.99')).toBe(1999);
    expect(toPaisa('0.1')).toBe(10);
    expect(toPaisa('1,250')).toBe(125000);
  });

  it('accepts Bangla digits and returns 0 for anything unreadable', () => {
    expect(toPaisa('১২৫০')).toBe(125000);
    expect(toPaisa('')).toBe(0);
    expect(toPaisa('abc')).toBe(0);
  });
});

describe('sanitizeAmountInput', () => {
  it('keeps digits and one decimal point with at most two decimals', () => {
    expect(sanitizeAmountInput('12.345')).toBe('12.34');
    expect(sanitizeAmountInput('1.2.3')).toBe('1.23');
    expect(sanitizeAmountInput('৳ 1,200')).toBe('1200');
    expect(sanitizeAmountInput('০০৫০')).toBe('50');
  });
});

describe('formatTaka', () => {
  it('groups thousands and drops .00', () => {
    expect(formatTaka(7750000)).toBe('৳ 77,500');
    expect(formatTaka(125050)).toBe('৳ 1,250.50');
    expect(formatTaka(-50)).toBe('−৳ 0.50');
  });
});
