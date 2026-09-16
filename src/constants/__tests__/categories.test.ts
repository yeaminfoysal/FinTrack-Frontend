import { describe, expect, it } from '@jest/globals';

import {
  BUILTIN_EXPENSE_CATEGORIES,
  CATEGORY_ICON_CHOICES,
  categorySet,
  emojiForIcon,
} from '@/constants/categories';
import { category } from '@/test/factories';

describe('categorySet', () => {
  const recharge = category('EXPENSE', 'মোবাইল রিচার্জ');
  const tuition = category('INCOME', 'টিউশন');

  it('offers the built-ins of its kind first, then the user’s own', () => {
    const set = categorySet('EXPENSE', [recharge, tuition]);
    expect(set.options.slice(0, BUILTIN_EXPENSE_CATEGORIES.length).map((o) => o.key)).toEqual(
      BUILTIN_EXPENSE_CATEGORIES.map((o) => o.key),
    );
    // The income category belongs to the other kind and never shows up here.
    expect(set.options.slice(BUILTIN_EXPENSE_CATEGORIES.length).map((o) => o.key)).toEqual([recharge.id]);
    expect(categorySet('INCOME', [recharge, tuition]).custom).toEqual([tuition]);
  });

  it('resolves a custom key by id and marks it custom', () => {
    const meta = categorySet('EXPENSE', [recharge]).meta(recharge.id);
    expect(meta).toMatchObject({ key: recharge.id, label: 'মোবাইল রিচার্জ', custom: true });
  });

  it('keeps resolving a deleted category, but stops offering it', () => {
    const removed = { ...recharge, isDeleted: true };
    const set = categorySet('EXPENSE', [removed]);
    // Old entries still show the name they were filed under.
    expect(set.meta(removed.id).label).toBe('মোবাইল রিচার্জ');
    expect(set.options.some((o) => o.key === removed.id)).toBe(false);
    expect(set.custom).toEqual([]);
  });

  it('falls back to "others" for a key nothing matches, and find() reports the miss', () => {
    const set = categorySet('EXPENSE');
    expect(set.meta('gone-forever').key).toBe('others');
    expect(set.find('gone-forever')).toBeUndefined();
    expect(categorySet('INCOME').meta('gone-forever').key).toBe('other');
  });

  it('spots a name already taken, by a built-in or by another custom one', () => {
    const set = categorySet('EXPENSE', [recharge]);
    expect(set.hasLabel('  খাবার ')).toBe(true); // a built-in, trimmed
    expect(set.hasLabel('মোবাইল রিচার্জ')).toBe(true);
    // Renaming a category doesn't collide with itself.
    expect(set.hasLabel('মোবাইল রিচার্জ', recharge.id)).toBe(false);
    expect(set.hasLabel('নতুন কিছু')).toBe(false);
  });
});

describe('emojiForIcon', () => {
  it('gives every icon choice its own emoji and falls back for an unknown one', () => {
    for (const choice of CATEGORY_ICON_CHOICES) expect(emojiForIcon(choice.iconName)).toBe(choice.icon);
    expect(emojiForIcon('not-an-icon')).toBe(CATEGORY_ICON_CHOICES[CATEGORY_ICON_CHOICES.length - 1].icon);
  });

  it('has no duplicate icon names', () => {
    const names = CATEGORY_ICON_CHOICES.map((c) => c.iconName);
    expect(new Set(names).size).toBe(names.length);
  });
});
