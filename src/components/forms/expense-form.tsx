import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { CategorySheet } from '@/components/category-sheet';
import { AmountInput } from '@/components/ui/amount-input';
import { Button } from '@/components/ui/button';
import { ChipSelect } from '@/components/ui/chip-select';
import { DateField } from '@/components/ui/date-field';
import { Field, FieldLabel } from '@/components/ui/field';
import { DEFAULT_EXPENSE_CATEGORY } from '@/constants/categories';
import { useCategorySet } from '@/hooks/use-categories';
import { dayKeyOf, dayKeyToIso, todayKey } from '@/lib/date';
import { useStrings } from '@/lib/i18n';
import { amountInputFromPaisa, formatTaka, toPaisa } from '@/lib/money';
import type { Expense } from '@/lib/types';
import { useTheme } from '@/providers/theme-provider';
import { useDataStore } from '@/stores/data';
import { confirmDialog, showToast } from '@/stores/ui';

interface ExpenseFormProps {
  /** Edit this expense; omit to add a new one. */
  existing?: Expense;
  /** Called after a save or delete — closes the screen. */
  onDone: () => void;
}

export function ExpenseForm({ existing, onDone }: ExpenseFormProps) {
  const { tokens } = useTheme();
  const strings = useStrings();
  const t = strings.expenseForm;
  const common = strings.common;
  const categories = useCategorySet('EXPENSE');
  const addExpense = useDataStore((s) => s.addExpense);
  const updateExpense = useDataStore((s) => s.updateExpense);
  const deleteExpense = useDataStore((s) => s.deleteExpense);
  const restoreExpense = useDataStore((s) => s.restoreExpense);

  const initialDay = existing ? dayKeyOf(existing.date) : todayKey();
  const [amount, setAmount] = useState(existing ? amountInputFromPaisa(existing.amount) : '');
  // An edited expense keeps the category it was filed under even if that one has since been
  // deleted; a new one never starts on a category that is no longer offered.
  const [category, setCategory] = useState(() => {
    if (existing) return existing.category;
    const last = useDataStore.getState().lastExpenseCategory;
    return last && categories.options.some((c) => c.key === last) ? last : DEFAULT_EXPENSE_CATEGORY;
  });
  const [addingCategory, setAddingCategory] = useState(false);
  const categoryOptions = useMemo(() => {
    // Show a deleted category too while it is the selected one, so the row is never blank.
    const selected = categories.options.some((c) => c.key === category) ? null : categories.find(category);
    return [...(selected ? [selected] : []), ...categories.options].map((c) => ({
      key: c.key,
      label: c.label,
      icon: c.iconName,
    }));
  }, [categories, category]);
  const [day, setDay] = useState(initialDay);
  const [description, setDescription] = useState(existing?.description ?? '');
  const [amountError, setAmountError] = useState<string | null>(null);

  const save = () => {
    const paisa = toPaisa(amount);
    if (paisa <= 0) {
      setAmountError(t.amountRequired);
      return;
    }
    // Keep the stored timestamp unless the day itself was changed.
    const date = existing && day === initialDay ? existing.date : dayKeyToIso(day);
    const values = { amount: paisa, category, date, description: description.trim() || null };

    if (existing) {
      const previous = {
        amount: existing.amount,
        category: existing.category,
        date: existing.date,
        description: existing.description,
      };
      updateExpense(existing.id, values);
      onDone();
      showToast({
        message: t.updated,
        actionLabel: common.undo,
        onAction: () => updateExpense(existing.id, previous),
      });
    } else {
      const id = addExpense(values);
      onDone();
      showToast({
        message: t.added(formatTaka(paisa)),
        actionLabel: common.undo,
        onAction: () => deleteExpense(id),
      });
    }
  };

  const remove = async () => {
    if (!existing) return;
    const confirmed = await confirmDialog({
      title: t.deleteTitle,
      message: t.deleteMessage,
      confirmLabel: common.delete,
      destructive: true,
    });
    if (!confirmed) return;
    deleteExpense(existing.id);
    onDone();
    showToast({
      message: t.deleted,
      actionLabel: common.undo,
      onAction: () => restoreExpense(existing.id),
    });
  };

  return (
    <>
      <AmountInput
        value={amount}
        onChangeText={(value) => {
          setAmount(value);
          setAmountError(null);
        }}
        error={amountError}
        autoFocus={!existing}
        accent={tokens.expense}
      />
      <View style={{ gap: 7 }}>
        <FieldLabel>{t.categoryLabel}</FieldLabel>
        <ChipSelect
          options={categoryOptions}
          value={category}
          onChange={setCategory}
          accessibilityLabel={t.categoryLabel}
          onAdd={() => setAddingCategory(true)}
          addLabel={t.addCategory}
        />
      </View>
      <DateField value={day} onChange={setDay} />
      <Field
        label={t.descriptionLabel}
        value={description}
        onChangeText={setDescription}
        placeholder={t.descriptionPlaceholder}
        multiline
        maxLength={500}
      />
      <Button label={existing ? common.saveChanges : t.saveNew} icon="checkmark" onPress={save} style={{ marginTop: 4 }} />
      {existing ? (
        <Button label={common.deleteButton} icon="trash-outline" variant="outline" color={tokens.expense} onPress={() => void remove()} />
      ) : null}
      {addingCategory ? (
        <CategorySheet
          visible
          onClose={() => setAddingCategory(false)}
          set={categories}
          onSaved={setCategory}
        />
      ) : null}
    </>
  );
}
