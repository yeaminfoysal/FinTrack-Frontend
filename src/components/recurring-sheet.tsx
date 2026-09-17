/**
 * Add or edit a standing entry: how much, what it is, and how often it repeats.
 *
 * Mount it only while it is open (or give it a key): the fields start from `existing`
 * and are not reset when `visible` flips.
 */
import { useState } from 'react';
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
import { BN_WEEKDAYS_SHORT } from '@/lib/date';
import { localDigits } from '@/lib/digits';
import { amountInputFromPaisa, formatTaka, toPaisa } from '@/lib/money';
import type { CategoryKind, Recurring, RecurringFrequency } from '@/lib/types';
import { useTheme } from '@/providers/theme-provider';
import { useDataStore } from '@/stores/data';
import { showToast } from '@/stores/ui';

const KIND_OPTIONS: { value: CategoryKind; label: string }[] = [
  { value: 'EXPENSE', label: 'খরচ' },
  { value: 'INCOME', label: 'আয়' },
];

const FREQUENCY_OPTIONS: { value: RecurringFrequency; label: string }[] = [
  { value: 'MONTHLY', label: 'প্রতি মাসে' },
  { value: 'WEEKLY', label: 'প্রতি সপ্তাহে' },
  { value: 'DAILY', label: 'প্রতিদিন' },
];

const DAY_OF_MONTH_OPTIONS: ChipOption[] = Array.from({ length: 31 }, (_, i) => ({
  key: String(i + 1),
  label: `${localDigits(i + 1)}`,
}));

const WEEKDAY_OPTIONS: ChipOption[] = BN_WEEKDAYS_SHORT.map((label, index) => ({ key: String(index), label }));

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
      setAmountError('কত টাকা লিখুন।');
      return;
    }
    const values = { kind, amount: paisa, category, frequency, anchor, note: note.trim() || null };
    if (existing) {
      updateRecurring(existing.id, values);
      showToast({ message: 'নিয়মিত লেনদেন আপডেট হয়েছে' });
    } else {
      addRecurring(values);
      showToast({ message: `নিয়মিত ${kind === 'EXPENSE' ? 'খরচ' : 'আয়'} যোগ হয়েছে · ${formatTaka(paisa)}` });
    }
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={existing ? 'নিয়মিত লেনদেন বদলান' : 'নতুন নিয়মিত লেনদেন'}
      scroll
      gap={14}>
      <Text style={{ fontSize: textSize.sm, lineHeight: 19, color: tokens.muted, marginTop: -6 }}>
        বাসা ভাড়া, বেতন, ইন্টারনেট বিল — যা প্রতিবার একই রকম। সময় হলে অ্যাপ নিজেই এন্ট্রিটা লিখে দেবে।
      </Text>

      <Segmented options={KIND_OPTIONS} value={kind} onChange={switchKind} accessibilityLabel="ধরন" />
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
        <FieldLabel>{kind === 'EXPENSE' ? 'ক্যাটাগরি' : 'উৎস'}</FieldLabel>
        <ChipSelect
          options={categoryOptions}
          value={category}
          onChange={setCategory}
          accessibilityLabel={kind === 'EXPENSE' ? 'ক্যাটাগরি' : 'উৎস'}
        />
      </View>

      <View style={{ gap: 7 }}>
        <FieldLabel>কত ঘন ঘন</FieldLabel>
        <Segmented options={FREQUENCY_OPTIONS} value={frequency} onChange={setFrequency} accessibilityLabel="কত ঘন ঘন" />
      </View>

      {frequency === 'MONTHLY' ? (
        <View style={{ gap: 7 }}>
          <FieldLabel>মাসের কত তারিখে</FieldLabel>
          <ChipSelect
            scroll
            options={DAY_OF_MONTH_OPTIONS}
            value={String(anchor)}
            onChange={(key) => setAnchor(Number(key))}
            accessibilityLabel="মাসের তারিখ"
          />
          {anchor > 28 ? (
            <Text style={{ fontSize: textSize.sm, lineHeight: 18, color: tokens.muted, marginLeft: 2 }}>
              যে মাসে {localDigits(anchor)} তারিখ নেই, সে মাসে শেষ দিনে হবে।
            </Text>
          ) : null}
        </View>
      ) : null}

      {frequency === 'WEEKLY' ? (
        <View style={{ gap: 7 }}>
          <FieldLabel>সপ্তাহের কোন দিন</FieldLabel>
          <ChipSelect
            scroll
            options={WEEKDAY_OPTIONS}
            value={String(anchor)}
            onChange={(key) => setAnchor(Number(key))}
            accessibilityLabel="সপ্তাহের দিন"
          />
        </View>
      ) : null}

      <Field
        label="নাম / বিবরণ (ঐচ্ছিক)"
        value={note}
        onChangeText={setNote}
        placeholder={kind === 'EXPENSE' ? 'যেমন: বাসা ভাড়া' : 'যেমন: বেতন'}
        maxLength={500}
      />

      <Button label={existing ? 'পরিবর্তন সেভ করুন' : 'সেভ করুন'} icon="checkmark" onPress={save} />
      {onDelete ? (
        <Button
          label="মুছে ফেলুন"
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
