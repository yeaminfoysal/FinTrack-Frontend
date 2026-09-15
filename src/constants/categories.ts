/** Expense categories & income sources with Bengali labels and icons. */
import type { IconName } from '@/components/ui/icon';

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
  /** Emoji, used in the PDF report. */
  icon: string;
  /** Vector icon, used in the app. */
  iconName: IconName;
};

export const EXPENSE_CATEGORIES: CategoryMeta[] = [
  { key: 'food', label: 'খাবার', en: 'Food', icon: '🍽', iconName: 'restaurant-outline' },
  { key: 'transport', label: 'যাতায়াত', en: 'Transport', icon: '🚌', iconName: 'bus-outline' },
  { key: 'shopping', label: 'কেনাকাটা', en: 'Shopping', icon: '🛍', iconName: 'bag-handle-outline' },
  { key: 'medical', label: 'চিকিৎসা', en: 'Medical', icon: '💊', iconName: 'medkit-outline' },
  { key: 'education', label: 'শিক্ষা', en: 'Education', icon: '📚', iconName: 'school-outline' },
  { key: 'entertainment', label: 'বিনোদন', en: 'Entertainment', icon: '🎬', iconName: 'film-outline' },
  { key: 'utilities', label: 'ইউটিলিটি', en: 'Utilities', icon: '💡', iconName: 'bulb-outline' },
  { key: 'others', label: 'অন্যান্য', en: 'Others', icon: '📦', iconName: 'cube-outline' },
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
  /** Emoji, used in the PDF report. */
  icon: string;
  /** Vector icon, used in the app. */
  iconName: IconName;
};

export const INCOME_SOURCES: IncomeSource[] = [
  { key: 'salary', label: 'বেতন', icon: '💼', iconName: 'briefcase-outline' },
  { key: 'freelance', label: 'ফ্রিল্যান্স', icon: '💻', iconName: 'laptop-outline' },
  { key: 'business', label: 'ব্যবসা', icon: '🏪', iconName: 'storefront-outline' },
  { key: 'gift', label: 'উপহার', icon: '🎁', iconName: 'gift-outline' },
  { key: 'other', label: 'অন্যান্য', icon: '➕', iconName: 'add-circle-outline' },
];

export function incomeSourceMeta(key: string): IncomeSource | undefined {
  return INCOME_SOURCES.find((s) => s.key === key);
}
