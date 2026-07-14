/** Expense categories & income sources with Bengali labels + glyphs. */

export type ExpenseCategory =
  | 'food'
  | 'transport'
  | 'shopping'
  | 'medical'
  | 'education'
  | 'entertainment'
  | 'utilities'
  | 'others';

export type CategoryMeta = {
  key: ExpenseCategory;
  label: string; // Bengali
  en: string;
  icon: string; // emoji/glyph
};

export const EXPENSE_CATEGORIES: CategoryMeta[] = [
  { key: 'food', label: 'খাবার', en: 'Food', icon: '🍽' },
  { key: 'transport', label: 'যাতায়াত', en: 'Transport', icon: '🚌' },
  { key: 'shopping', label: 'কেনাকাটা', en: 'Shopping', icon: '🛍' },
  { key: 'medical', label: 'চিকিৎসা', en: 'Medical', icon: '💊' },
  { key: 'education', label: 'শিক্ষা', en: 'Education', icon: '📚' },
  { key: 'entertainment', label: 'বিনোদন', en: 'Entertainment', icon: '🎬' },
  { key: 'utilities', label: 'ইউটিলিটি', en: 'Utilities', icon: '💡' },
  { key: 'others', label: 'অন্যান্য', en: 'Others', icon: '📦' },
];

export const CATEGORY_MAP: Record<ExpenseCategory, CategoryMeta> = Object.fromEntries(
  EXPENSE_CATEGORIES.map((c) => [c.key, c]),
) as Record<ExpenseCategory, CategoryMeta>;

export function categoryMeta(key: string): CategoryMeta {
  return CATEGORY_MAP[key as ExpenseCategory] ?? CATEGORY_MAP.others;
}

export type IncomeSource = {
  key: string;
  label: string; // Bengali
  icon: string;
};

export const INCOME_SOURCES: IncomeSource[] = [
  { key: 'salary', label: 'বেতন', icon: '💼' },
  { key: 'freelance', label: 'ফ্রিল্যান্স', icon: '💻' },
  { key: 'business', label: 'ব্যবসা', icon: '🏪' },
  { key: 'gift', label: 'উপহার', icon: '🎁' },
  { key: 'other', label: 'অন্যান্য', icon: '➕' },
];
