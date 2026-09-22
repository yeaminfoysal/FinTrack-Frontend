/**
 * Add or edit a standing entry: how much, what it is, and how often it repeats.
 *
 * Mount it only while it is open (or give it a key): the fields start from `existing`
 * and are not reset when `visible` flips.
 */
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { AmountInput } from '@/components/ui/amount-input';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { ChipSelect, type ChipOption } from '@/components/ui/chip-select';
import { Field, FieldLabel } from '@/components/ui/field';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { DEFAULT_EXPENSE_CATEGORY, DEFAULT_INCOME_SOURCE } from '@/constants/categories';
import { textSize } from '@/constants/typography';
import { useCategorySet } from '@/hooks/use-categories';
import { weekdayNamesShort } from '@/lib/date';
import { localDigits } from '@/lib/digits';
import { useStrings } from '@/lib/i18n';
import { amountInputFromPaisa, formatTaka, toPaisa } from '@/lib/money';
import type { CategoryKind, Recurring, RecurringFrequency } from '@/lib/types';
import { useTheme } from '@/providers/theme-provider';
import { useDataStore } from '@/stores/data';
import { showToast } from '@/stores/ui';

const DAY_OF_MONTH_OPTIONS: ChipOption[] = Array.from({ length: 31 }, (_, i) => ({
  key: String(i + 1),
  label: `${localDigits(i + 1)}`,
}));

interface RecurringSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Edit this rule; omit to create a new one. */
  existing?: Recurring;
  /** Shown while editing. The sheet closes first, so a confirm dialog isn't hidden behind it. */
  onDelete?: () => void;
}

export function RecurringSheet({ visible, onClose, existing, onDelete }: RecurringSheetProps) {
  const { tokens } = useTheme();
  const s = useStrings();
  const t = s.recurringSheet;
  // Rebuilt when the language changes, so the chips and segments follow it.
  const kindOptions = useMemo<{ value: CategoryKind; label: string }[]>(
    () => [
      { value: 'EXPENSE', label: s.activity.expense },
      { value: 'INCOME', label: s.activity.income },
    ],
    [s],
  );
  const frequencyOptions = useMemo<{ value: RecurringFrequency; label: string }[]>(
    () => [
      { value: 'MONTHLY', label: t.monthly },
      { value: 'WEEKLY', label: t.weekly },
      { value: 'DAILY', label: t.daily },
    ],
    [t],
  );
  // Cheap enough to rebuild each render, and it has to follow the language.
  const weekdayOptions: ChipOption[] = weekdayNamesShort().map((label, index) => ({ key: String(index), label }));
  const addRecurring = useDataStore((s) => s.addRecurring);
  const updateRecurring = useDataStore((s) => s.updateRecurring);

  const [kind, setKind] = useState<CategoryKind>(existing?.kind ?? 'EXPENSE');
  const [amount, setAmount] = useState(existing ? amountInputFromPaisa(existing.amount) : '');
  const [category, setCategory] = useState(existing?.category ?? DEFAULT_EXPENSE_CATEGORY);
  const [frequency, setFrequency] = useState<RecurringFrequency>(existing?.frequency ?? 'MONTHLY');
  const [anchor, setAnchor] = useState(existing?.anchor ?? 1);
  const [note, setNote] = useState(existing?.note ?? '');
  const [amountError, setAmountError] = useState<string | null>(null);

  const categories = useCategorySet(kind);
  const categoryOptions: ChipOption[] = [
    // A category since deleted still shows while it is the one picked, so the row is never blank.
    ...(categories.options.some((c) => c.key === category) ? [] : [categories.find(category)].filter((c) => c != null)),
    ...categories.options,
  ].map((c) => ({ key: c.key, label: c.label, icon: c.iconName }));

  /** Switching between expense and income changes which list the key belongs to. */
  const switchKind = (next: CategoryKind) => {
    setKind(next);
    setCategory(next === 'EXPENSE' ? DEFAULT_EXPENSE_CATEGORY : DEFAULT_INCOME_SOURCE);
  };

  const save = () => {
    const paisa = toPaisa(amount);
    if (paisa <= 0) {
      setAmountError(t.amountRequired);
      return;
    }
    const values = { kind, amount: paisa, category, frequency, anchor, note: note.trim() || null };
    if (existing) {
      updateRecurring(existing.id, values);
      showToast({ message: t.updated });
    } else {
      addRecurring(values);
      showToast({ message: t.added(kind === 'EXPENSE' ? s.activity.expense : s.activity.income, formatTaka(paisa)) });
    }
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={existing ? t.editTitle : t.newTitle}
      scroll
      gap={14}>
      <Text style={{ fontSize: textSize.sm, lineHeight: 19, color: tokens.muted, marginTop: -6 }}>
        {t.intro}
      </Text>

      <Segmented options={kindOptions} value={kind} onChange={switchKind} accessibilityLabel={t.kind} />
      <AmountInput
        value={amount}
        onChangeText={(value) => {
          setAmount(value);
          setAmountError(null);
        }}
        error={amountError}
        accent={kind === 'EXPENSE' ? tokens.expense : tokens.income}
      />

      <View style={{ gap: 7 }}>
        <FieldLabel>{kind === 'EXPENSE' ? t.category : t.source}</FieldLabel>
        <ChipSelect
          options={categoryOptions}
          value={category}
          onChange={setCategory}
          accessibilityLabel={kind === 'EXPENSE' ? t.category : t.source}
        />
      </View>

      <View style={{ gap: 7 }}>
        <FieldLabel>{t.howOften}</FieldLabel>
        <Segmented options={frequencyOptions} value={frequency} onChange={setFrequency} accessibilityLabel={t.howOften} />
      </View>

      {frequency === 'MONTHLY' ? (
        <View style={{ gap: 7 }}>
          <FieldLabel>{t.dayOfMonth}</FieldLabel>
          <ChipSelect
            scroll
            options={DAY_OF_MONTH_OPTIONS}
            value={String(anchor)}
            onChange={(key) => setAnchor(Number(key))}
            accessibilityLabel={t.dayOfMonthA11y}
          />
          {anchor > 28 ? (
            <Text style={{ fontSize: textSize.sm, lineHeight: 18, color: tokens.muted, marginLeft: 2 }}>
              {t.shortMonthNote(localDigits(anchor))}
            </Text>
          ) : null}
        </View>
      ) : null}

      {frequency === 'WEEKLY' ? (
        <View style={{ gap: 7 }}>
          <FieldLabel>{t.weekday}</FieldLabel>
          <ChipSelect
            scroll
            options={weekdayOptions}
            value={String(anchor)}
            onChange={(key) => setAnchor(Number(key))}
            accessibilityLabel={t.weekdayA11y}
          />
        </View>
      ) : null}

      <Field
        label={t.noteLabel}
        value={note}
        onChangeText={setNote}
        placeholder={kind === 'EXPENSE' ? t.expensePlaceholder : t.incomePlaceholder}
        maxLength={500}
      />

      <Button label={existing ? s.common.saveChanges : s.common.save} icon="checkmark" onPress={save} />
      {onDelete ? (
        <Button
          label={t.deleteButton}
          icon="trash-outline"
          variant="outline"
          color={tokens.expense}
          onPress={() => {
            onClose();
            onDelete();
          }}
        />
      ) : null}
    </BottomSheet>
  );
}
