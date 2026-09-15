import { useState } from 'react';
import { View } from 'react-native';

import { AmountInput } from '@/components/ui/amount-input';
import { Button } from '@/components/ui/button';
import { ChipSelect } from '@/components/ui/chip-select';
import { DateField } from '@/components/ui/date-field';
import { Field, FieldLabel } from '@/components/ui/field';
import { INCOME_SOURCES } from '@/constants/categories';
import { dayKeyOf, dayKeyToIso, todayKey } from '@/lib/date';
import { amountInputFromPaisa, formatTaka, toPaisa } from '@/lib/money';
import type { Income } from '@/lib/types';
import { useTheme } from '@/providers/theme-provider';
import { useDataStore } from '@/stores/data';
import { confirmDialog, showToast } from '@/stores/ui';

const SOURCE_OPTIONS = INCOME_SOURCES.map((s) => ({ key: s.key, label: s.label, icon: s.iconName }));

interface IncomeFormProps {
  /** Edit this income; omit to add a new one. */
  existing?: Income;
  /** Called after a save or delete — closes the screen. */
  onDone: () => void;
}

export function IncomeForm({ existing, onDone }: IncomeFormProps) {
  const { tokens } = useTheme();
  const addIncome = useDataStore((s) => s.addIncome);
  const updateIncome = useDataStore((s) => s.updateIncome);
  const deleteIncome = useDataStore((s) => s.deleteIncome);
  const restoreIncome = useDataStore((s) => s.restoreIncome);

  const initialDay = existing ? dayKeyOf(existing.date) : todayKey();
  const [amount, setAmount] = useState(existing ? amountInputFromPaisa(existing.amount) : '');
  const [source, setSource] = useState(() => existing?.source ?? useDataStore.getState().lastIncomeSource ?? 'salary');
  const [day, setDay] = useState(initialDay);
  const [note, setNote] = useState(existing?.note ?? '');
  const [amountError, setAmountError] = useState<string | null>(null);

  const save = () => {
    const paisa = toPaisa(amount);
    if (paisa <= 0) {
      setAmountError('আয়ের পরিমাণ লিখুন।');
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
        message: 'আয় আপডেট হয়েছে',
        actionLabel: 'ফিরিয়ে নিন',
        onAction: () => updateIncome(existing.id, previous),
      });
    } else {
      const id = addIncome(values);
      onDone();
      showToast({
        message: `আয় যোগ হয়েছে · ${formatTaka(paisa)}`,
        actionLabel: 'ফিরিয়ে নিন',
        onAction: () => deleteIncome(id),
      });
    }
  };

  const remove = async () => {
    if (!existing) return;
    const confirmed = await confirmDialog({
      title: 'আয় ডিলিট করবেন?',
      message: 'এই আয়টি মুছে যাবে এবং মাসের হিসাব আবার গণনা হবে।',
      confirmLabel: 'ডিলিট',
      destructive: true,
    });
    if (!confirmed) return;
    deleteIncome(existing.id);
    onDone();
    showToast({
      message: 'আয় ডিলিট হয়েছে',
      actionLabel: 'ফিরিয়ে নিন',
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
        <FieldLabel>উৎস</FieldLabel>
        <ChipSelect options={SOURCE_OPTIONS} value={source} onChange={setSource} accessibilityLabel="আয়ের উৎস" />
      </View>
      <DateField value={day} onChange={setDay} />
      <Field
        label="নোট (ঐচ্ছিক)"
        value={note}
        onChangeText={setNote}
        placeholder="যেমন: সেপ্টেম্বরের বেতন"
        multiline
        maxLength={500}
      />
      <Button label={existing ? 'পরিবর্তন সেভ করুন' : 'আয় সেভ করুন'} icon="checkmark" onPress={save} style={{ marginTop: 4 }} />
      {existing ? (
        <Button label="ডিলিট করুন" icon="trash-outline" variant="outline" color={tokens.expense} onPress={() => void remove()} />
      ) : null}
    </>
  );
}
