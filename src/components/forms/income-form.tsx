import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { CategorySheet } from '@/components/category-sheet';
import { AmountInput } from '@/components/ui/amount-input';
import { Button } from '@/components/ui/button';
import { ChipSelect } from '@/components/ui/chip-select';
import { DateField } from '@/components/ui/date-field';
import { Field, FieldLabel } from '@/components/ui/field';
import { DEFAULT_INCOME_SOURCE } from '@/constants/categories';
import { useCategorySet } from '@/hooks/use-categories';
import { dayKeyOf, dayKeyToIso, todayKey } from '@/lib/date';
import { useStrings } from '@/lib/i18n';
import { amountInputFromPaisa, formatTaka, toPaisa } from '@/lib/money';
import type { Income } from '@/lib/types';
import { useTheme } from '@/providers/theme-provider';
import { useDataStore } from '@/stores/data';
import { confirmDialog, showToast } from '@/stores/ui';

interface IncomeFormProps {
  /** Edit this income; omit to add a new one. */
  existing?: Income;
  /** Called after a save or delete — closes the screen. */
  onDone: () => void;
}

export function IncomeForm({ existing, onDone }: IncomeFormProps) {
  const { tokens } = useTheme();
  const strings = useStrings();
  const t = strings.incomeForm;
  const common = strings.common;
  const sources = useCategorySet('INCOME');
  const addIncome = useDataStore((s) => s.addIncome);
  const updateIncome = useDataStore((s) => s.updateIncome);
  const deleteIncome = useDataStore((s) => s.deleteIncome);
  const restoreIncome = useDataStore((s) => s.restoreIncome);

  const initialDay = existing ? dayKeyOf(existing.date) : todayKey();
  const [amount, setAmount] = useState(existing ? amountInputFromPaisa(existing.amount) : '');
  // An edited income keeps the source it was filed under even if that one has since been
  // deleted; a new one never starts on a source that is no longer offered.
  const [source, setSource] = useState(() => {
    if (existing) return existing.source;
    const last = useDataStore.getState().lastIncomeSource;
    return last && sources.options.some((s) => s.key === last) ? last : DEFAULT_INCOME_SOURCE;
  });
  const [addingSource, setAddingSource] = useState(false);
  const sourceOptions = useMemo(() => {
    // Show a deleted source too while it is the selected one, so the row is never blank.
    const selected = sources.options.some((s) => s.key === source) ? null : sources.find(source);
    return [...(selected ? [selected] : []), ...sources.options].map((s) => ({
      key: s.key,
      label: s.label,
      icon: s.iconName,
    }));
  }, [sources, source]);
  const [day, setDay] = useState(initialDay);
  const [note, setNote] = useState(existing?.note ?? '');
  const [amountError, setAmountError] = useState<string | null>(null);

  const save = () => {
    const paisa = toPaisa(amount);
    if (paisa <= 0) {
      setAmountError(t.amountRequired);
      return;
    }
    // Keep the stored timestamp unless the day itself was changed.
    const date = existing && day === initialDay ? existing.date : dayKeyToIso(day);
    const values = { amount: paisa, source, date, note: note.trim() || null };

    if (existing) {
      const previous = { amount: existing.amount, source: existing.source, date: existing.date, note: existing.note };
      updateIncome(existing.id, values);
      onDone();
      showToast({
        message: t.updated,
        actionLabel: common.undo,
        onAction: () => updateIncome(existing.id, previous),
      });
    } else {
      const id = addIncome(values);
      onDone();
      showToast({
        message: t.added(formatTaka(paisa)),
        actionLabel: common.undo,
        onAction: () => deleteIncome(id),
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
    deleteIncome(existing.id);
    onDone();
    showToast({
      message: t.deleted,
      actionLabel: common.undo,
      onAction: () => restoreIncome(existing.id),
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
        accent={tokens.income}
      />
      <View style={{ gap: 7 }}>
        <FieldLabel>{t.sourceLabel}</FieldLabel>
        <ChipSelect
          options={sourceOptions}
          value={source}
          onChange={setSource}
          accessibilityLabel={t.sourceA11y}
          onAdd={() => setAddingSource(true)}
          addLabel={t.addSource}
        />
      </View>
      <DateField value={day} onChange={setDay} />
      <Field
        label={strings.ui.noteLabel}
        value={note}
        onChangeText={setNote}
        placeholder={t.notePlaceholder}
        multiline
        maxLength={500}
      />
      <Button label={existing ? common.saveChanges : t.saveNew} icon="checkmark" onPress={save} style={{ marginTop: 4 }} />
      {existing ? (
        <Button label={common.deleteButton} icon="trash-outline" variant="outline" color={tokens.expense} onPress={() => void remove()} />
      ) : null}
      {addingSource ? (
        <CategorySheet visible onClose={() => setAddingSource(false)} set={sources} onSaved={setSource} />
      ) : null}
    </>
  );
}
