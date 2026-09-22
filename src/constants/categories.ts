/**
 * Expense categories and income sources: the fixed built-in ones plus whatever the user
 * added (Category records in the store, synced like any other record).
 *
 * An entry stores a key — a built-in slug like "food", or a custom category's record id.
 * `categorySet()` turns the store's categories into the chips to offer and a lookup that
 * resolves a stored key. Deleted custom categories still resolve, so older entries keep
 * their name; they just stop being offered.
 */
import type { IconName } from '@/components/ui/icon';
import { getLanguage, type Lang } from '@/lib/i18n';
import type { Category, CategoryKind } from '@/lib/types';

export type CategoryOption = {
  /** What an expense.category / income.source holds. */
  key: string;
  /** In the reading language. */
  label: string;
  /** Emoji, used in the PDF report. */
  icon: string;
  /** Vector icon, used in the app. */
  iconName: IconName;
  /** English label, matched by search. Built-ins only. */
  en?: string;
  /** Every name this option goes by, so a search finds it in either language. */
  searchTerms?: string[];
  /** Added by the user — can be renamed or removed. */
  custom?: boolean;
};

/**
 * A built-in category. Its names live here rather than in the language catalogue
 * because they belong to the key: `food` is one thing with two names, and an entry
 * written in Bangla has to keep reading right after a switch to English.
 */
type BuiltinCategory = { key: string; bn: string; en: string; icon: string; iconName: IconName };

export const BUILTIN_EXPENSE_CATEGORIES: BuiltinCategory[] = [
  { key: 'food', bn: 'খাবার', en: 'Food', icon: '🍽', iconName: 'restaurant-outline' },
  { key: 'transport', bn: 'যাতায়াত', en: 'Transport', icon: '🚌', iconName: 'bus-outline' },
  { key: 'shopping', bn: 'কেনাকাটা', en: 'Shopping', icon: '🛍', iconName: 'bag-handle-outline' },
  { key: 'medical', bn: 'চিকিৎসা', en: 'Medical', icon: '💊', iconName: 'medkit-outline' },
  { key: 'education', bn: 'শিক্ষা', en: 'Education', icon: '📚', iconName: 'school-outline' },
  { key: 'entertainment', bn: 'বিনোদন', en: 'Entertainment', icon: '🎬', iconName: 'film-outline' },
  { key: 'utilities', bn: 'ইউটিলিটি', en: 'Utilities', icon: '💡', iconName: 'bulb-outline' },
  { key: 'others', bn: 'অন্যান্য', en: 'Others', icon: '📦', iconName: 'cube-outline' },
];

export const BUILTIN_INCOME_SOURCES: BuiltinCategory[] = [
  { key: 'salary', bn: 'বেতন', en: 'Salary', icon: '💼', iconName: 'briefcase-outline' },
  { key: 'freelance', bn: 'ফ্রিল্যান্স', en: 'Freelance', icon: '💻', iconName: 'laptop-outline' },
  { key: 'business', bn: 'ব্যবসা', en: 'Business', icon: '🏪', iconName: 'storefront-outline' },
  { key: 'gift', bn: 'উপহার', en: 'Gift', icon: '🎁', iconName: 'gift-outline' },
  { key: 'other', bn: 'অন্যান্য', en: 'Other', icon: '➕', iconName: 'add-circle-outline' },
];

/** The key a new entry starts on, and where an unknown expense key lands. */
export const DEFAULT_EXPENSE_CATEGORY = 'food';
export const DEFAULT_INCOME_SOURCE = 'salary';

function builtinOption(c: BuiltinCategory, lang: Lang): CategoryOption {
  return {
    key: c.key,
    label: lang === 'en' ? c.en : c.bn,
    icon: c.icon,
    iconName: c.iconName,
    en: c.en,
    searchTerms: [c.bn, c.en],
  };
}

export const builtinsOf = (kind: CategoryKind, lang: Lang = getLanguage()): CategoryOption[] =>
  (kind === 'EXPENSE' ? BUILTIN_EXPENSE_CATEGORIES : BUILTIN_INCOME_SOURCES).map((c) => builtinOption(c, lang));

/** Stands in for a key that matches nothing — a category deleted on a device that never synced. */
function fallbackOf(kind: CategoryKind, lang: Lang): CategoryOption {
  const builtins = kind === 'EXPENSE' ? BUILTIN_EXPENSE_CATEGORIES : BUILTIN_INCOME_SOURCES;
  return builtinOption(builtins[builtins.length - 1], lang);
}

/** Icon + matching emoji a user picks from when creating a category. */
export const CATEGORY_ICON_CHOICES: { iconName: IconName; icon: string }[] = [
  { iconName: 'restaurant-outline', icon: '🍽' },
  { iconName: 'fast-food-outline', icon: '🍔' },
  { iconName: 'cafe-outline', icon: '☕' },
  { iconName: 'cart-outline', icon: '🛒' },
  { iconName: 'bag-handle-outline', icon: '🛍' },
  { iconName: 'shirt-outline', icon: '👕' },
  { iconName: 'bus-outline', icon: '🚌' },
  { iconName: 'car-outline', icon: '🚗' },
  { iconName: 'bicycle-outline', icon: '🚲' },
  { iconName: 'airplane-outline', icon: '✈️' },
  { iconName: 'home-outline', icon: '🏠' },
  { iconName: 'bed-outline', icon: '🛏' },
  { iconName: 'bulb-outline', icon: '💡' },
  { iconName: 'water-outline', icon: '💧' },
  { iconName: 'flame-outline', icon: '🔥' },
  { iconName: 'wifi-outline', icon: '📶' },
  { iconName: 'call-outline', icon: '📞' },
  { iconName: 'phone-portrait-outline', icon: '📱' },
  { iconName: 'laptop-outline', icon: '💻' },
  { iconName: 'game-controller-outline', icon: '🎮' },
  { iconName: 'film-outline', icon: '🎬' },
  { iconName: 'musical-notes-outline', icon: '🎵' },
  { iconName: 'football-outline', icon: '⚽' },
  { iconName: 'barbell-outline', icon: '🏋' },
  { iconName: 'medkit-outline', icon: '💊' },
  { iconName: 'heart-outline', icon: '❤️' },
  { iconName: 'school-outline', icon: '📚' },
  { iconName: 'book-outline', icon: '📖' },
  { iconName: 'briefcase-outline', icon: '💼' },
  { iconName: 'storefront-outline', icon: '🏪' },
  { iconName: 'gift-outline', icon: '🎁' },
  { iconName: 'people-outline', icon: '👥' },
  { iconName: 'paw-outline', icon: '🐾' },
  { iconName: 'cut-outline', icon: '✂️' },
  { iconName: 'construct-outline', icon: '🔧' },
  { iconName: 'card-outline', icon: '💳' },
  { iconName: 'cash-outline', icon: '💵' },
  { iconName: 'wallet-outline', icon: '👛' },
  { iconName: 'trending-up-outline', icon: '📈' },
  { iconName: 'leaf-outline', icon: '🌿' },
  { iconName: 'umbrella-outline', icon: '☂️' },
  { iconName: 'receipt-outline', icon: '🧾' },
  { iconName: 'ticket-outline', icon: '🎟' },
  { iconName: 'star-outline', icon: '⭐' },
  { iconName: 'cube-outline', icon: '📦' },
];

export const DEFAULT_CATEGORY_ICON = CATEGORY_ICON_CHOICES[CATEGORY_ICON_CHOICES.length - 1];

/** The emoji that goes with an Ionicons name, for the PDF report. */
export function emojiForIcon(iconName: string): string {
  return CATEGORY_ICON_CHOICES.find((c) => c.iconName === iconName)?.icon ?? DEFAULT_CATEGORY_ICON.icon;
}

function toOption(c: Category): CategoryOption {
  return { key: c.id, label: c.label, icon: c.icon, iconName: c.iconName as IconName, custom: true };
}

export interface CategorySet {
  kind: CategoryKind;
  /** Built-ins first, then the user's own — what the chips and filters offer. */
  options: CategoryOption[];
  /** The user's own live categories, oldest first. */
  custom: Category[];
  /** Display meta for a stored key. A key nothing matches falls back to "অন্যান্য" / "Others". */
  meta: (key: string) => CategoryOption;
  /** Like meta, but undefined when the key matches nothing. */
  find: (key: string) => CategoryOption | undefined;
  /** True when another live category of this kind already carries that name. */
  hasLabel: (label: string, exceptId?: string) => boolean;
}

/** Built-ins plus the user's categories of one kind, ready for chips and lookups. */
export function categorySet(
  kind: CategoryKind,
  categories: readonly Category[] = [],
  lang: Lang = getLanguage(),
): CategorySet {
  const builtins = builtinsOf(kind, lang);
  const mine = categories.filter((c) => c.kind === kind);
  const live = mine.filter((c) => !c.isDeleted);

  // Deleted ones stay in the index so entries that used them keep their name.
  const index = new Map(builtins.map((o) => [o.key, o]));
  for (const c of mine) index.set(c.id, toOption(c));

  const normalized = (label: string) => label.trim().toLowerCase();
  const taken = new Map([...builtins, ...live.map(toOption)].map((o) => [normalized(o.label), o.key]));

  return {
    kind,
    options: [...builtins, ...live.map(toOption)],
    custom: live,
    meta: (key) => index.get(key) ?? fallbackOf(kind, lang),
    find: (key) => index.get(key),
    hasLabel: (label, exceptId) => {
      const owner = taken.get(normalized(label));
      return owner !== undefined && owner !== exceptId;
    },
  };
}
