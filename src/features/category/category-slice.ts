/**
 * Categories the user adds on top of the built-in ones. They hold no money, so they
 * reuse the shared record actions with no cash events — the practical balance never
 * moves for a category change.
 *
 * A new category keeps its id forever: that id is what entries store, so a rename or a
 * delete never detaches an entry from its label.
 */
import { emojiForIcon } from '@/constants/categories';
import type { CategoryActions, DataSlice } from '@/features/data-state';
import { recordActions } from '@/features/records/record-actions';
import { upsertCategory } from '@/lib/db/repo';
import { newBase } from '@/lib/records';
import type { Category } from '@/lib/types';

export const createCategorySlice: DataSlice<CategoryActions> = (set) => {
  const categories = recordActions<Category>(set, {
    list: 'categories',
    save: upsertCategory,
    cashEvents: () => [],
  });

  return {
    addCategory: (input) => {
      const rec: Category = {
        ...newBase(),
        kind: input.kind,
        label: input.label.trim(),
        icon: emojiForIcon(input.iconName),
        iconName: input.iconName,
      };
      categories.add(rec);
      return rec.id;
    },
    // The report emoji follows the icon, so it is re-derived whenever the icon changes.
    updateCategory: (id, patch) =>
      categories.update(id, {
        ...patch,
        ...(patch.label === undefined ? {} : { label: patch.label.trim() }),
        ...(patch.iconName === undefined ? {} : { icon: emojiForIcon(patch.iconName) }),
      }),
    deleteCategory: categories.remove,
    restoreCategory: categories.restore,
  };
};
