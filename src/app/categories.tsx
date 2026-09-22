/**
 * Manage the categories the user added: a tab per kind (expense / income), the built-in
 * ones shown read-only above the user's own, and add / rename / delete below.
 */
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { CategorySheet } from '@/components/category-sheet';
import { ModalShell } from '@/components/modal-shell';
import { PageTitle } from '@/components/page-title';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { ListGroup, ListRow } from '@/components/ui/list-row';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { builtinsOf } from '@/constants/categories';
import { textSize } from '@/constants/typography';
import { useCategorySet } from '@/hooks/use-categories';
import { localDigits } from '@/lib/digits';
import { useStrings } from '@/lib/i18n';
import type { Category, CategoryKind } from '@/lib/types';
import { useTheme } from '@/providers/theme-provider';
import { useDataStore } from '@/stores/data';
import { confirmDialog, showToast } from '@/stores/ui';

export default function CategoriesScreen() {
  const { tokens } = useTheme();
  const strings = useStrings();
  const t = strings.categoriesScreen;
  const [kind, setKind] = useState<CategoryKind>('EXPENSE');
  const kindOptions = useMemo<{ value: CategoryKind; label: string }[]>(
    () => [
      { value: 'EXPENSE', label: t.expenseKind },
      { value: 'INCOME', label: t.incomeKind },
    ],
    [t],
  );
  const set = useCategorySet(kind);
  const noun = kind === 'EXPENSE' ? strings.categorySheet.expenseNoun : strings.categorySheet.incomeNoun;

  // null = the sheet is closed, undefined inside it = "add new".
  const [editing, setEditing] = useState<{ category?: Category } | null>(null);

  const expenses = useDataStore((s) => s.expenses);
  const incomes = useDataStore((s) => s.incomes);
  const deleteCategory = useDataStore((s) => s.deleteCategory);
  const restoreCategory = useDataStore((s) => s.restoreCategory);

  /** How many live entries sit on each category key — shown as the row's subtitle. */
  const usage = useMemo(() => {
    const counts = new Map<string, number>();
    const rows: { key: string }[] =
      kind === 'EXPENSE'
        ? expenses.filter((e) => !e.isDeleted).map((e) => ({ key: e.category }))
        : incomes.filter((i) => !i.isDeleted).map((i) => ({ key: i.source }));
    for (const row of rows) counts.set(row.key, (counts.get(row.key) ?? 0) + 1);
    return counts;
  }, [kind, expenses, incomes]);

  const usageLabel = (key: string) => {
    const count = usage.get(key) ?? 0;
    return count === 0 ? t.noEntries : t.entryCount(localDigits(count));
  };

  const remove = async (category: Category) => {
    const count = usage.get(category.id) ?? 0;
    const confirmed = await confirmDialog({
      title: t.deleteTitle(category.label),
      message: count > 0 ? t.deleteWithEntries(noun, localDigits(count)) : t.deleteEmpty(noun),
      confirmLabel: strings.common.remove,
      destructive: true,
    });
    if (!confirmed) return;
    deleteCategory(category.id);
    showToast({
      message: t.deleted(noun),
      actionLabel: strings.common.undo,
      onAction: () => restoreCategory(category.id),
    });
  };

  return (
    <ModalShell title={t.title}>
      <PageTitle title={t.title} />
      <Segmented options={kindOptions} value={kind} onChange={setKind} accessibilityLabel={t.kindA11y} />

      <Section label={t.yoursHeading(noun)}>
        {set.custom.length === 0 ? (
          <Text style={{ fontSize: textSize.sm, lineHeight: 20, color: tokens.muted, marginLeft: 2 }}>
            {t.yoursNote(noun)}
          </Text>
        ) : (
          <ListGroup>
            {set.custom.map((category, index) => (
              <ListRow
                key={category.id}
                title={category.label}
                subtitle={usageLabel(category.id)}
                icon={set.meta(category.id).iconName}
                tint={tokens.primary}
                divider={index > 0}
                onPress={() => setEditing({ category })}
                accessibilityHint={t.rowHint}
                trailing={<Icon name="chevron-forward" size={18} color={tokens.muted} />}
              />
            ))}
          </ListGroup>
        )}
        <Button
          label={t.addNew(noun)}
          icon="add"
          variant="secondary"
          onPress={() => setEditing({})}
        />
      </Section>

      <Section label={t.defaultsHeading(noun)}>
        <ListGroup>
          {builtinsOf(kind).map((option, index) => (
            <ListRow
              key={option.key}
              title={option.label}
              subtitle={usageLabel(option.key)}
              icon={option.iconName}
              divider={index > 0}
            />
          ))}
        </ListGroup>
        <Text style={{ fontSize: textSize.sm, lineHeight: 18, color: tokens.muted, marginLeft: 2 }}>
          {t.defaultsNote}
        </Text>
      </Section>

      {editing ? (
        <CategorySheet
          visible
          onClose={() => setEditing(null)}
          set={set}
          existing={editing.category}
          onDelete={editing.category ? () => void remove(editing.category!) : undefined}
        />
      ) : null}
    </ModalShell>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  const { tokens } = useTheme();
  return (
    <View style={{ gap: 10 }}>
      <Text
        accessibilityRole="header"
        style={{ fontSize: textSize.sm, fontWeight: '700', color: tokens.muted, marginLeft: 2, marginTop: 6 }}>
        {label}
      </Text>
      {children}
    </View>
  );
}
