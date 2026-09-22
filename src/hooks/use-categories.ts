import { useMemo } from 'react';

import { categorySet, type CategorySet } from '@/constants/categories';
import { useLanguage } from '@/lib/i18n';
import type { CategoryKind } from '@/lib/types';
import { useDataStore } from '@/stores/data';

/** The built-in categories of one kind plus the user's own — chips, filters and lookups. */
export function useCategorySet(kind: CategoryKind): CategorySet {
  const categories = useDataStore((s) => s.categories);
  // The built-in labels are read in the current language, so the set is rebuilt when it changes.
  const lang = useLanguage();
  return useMemo(() => categorySet(kind, categories, lang), [kind, categories, lang]);
}
