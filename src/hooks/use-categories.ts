import { useMemo } from 'react';

import { categorySet, type CategorySet } from '@/constants/categories';
import type { CategoryKind } from '@/lib/types';
import { useDataStore } from '@/stores/data';

/** The built-in categories of one kind plus the user's own — chips, filters and lookups. */
export function useCategorySet(kind: CategoryKind): CategorySet {
  const categories = useDataStore((s) => s.categories);
  return useMemo(() => categorySet(kind, categories), [kind, categories]);
}
