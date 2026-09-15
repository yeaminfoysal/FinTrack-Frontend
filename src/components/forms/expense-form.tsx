import { useState } from 'react';
import { View } from 'react-native';

import { AmountInput } from '@/components/ui/amount-input';
import { Button } from '@/components/ui/button';
import { ChipSelect } from '@/components/ui/chip-select';
import { DateField } from '@/components/ui/date-field';
import { Field, FieldLabel } from '@/components/ui/field';
import { EXPENSE_CATEGORIES } from '@/constants/categories';
import { dayKeyOf, dayKeyToIso, todayKey } from '@/lib/date';
import { amountInputFromPaisa, formatTaka, toPaisa } from '@/lib/money';
import type { Expense } from '@/lib/types';
import { useTheme } from '@/providers/theme-provider';
import { useDataStore } from '@/stores/data';
import { confirmDialog, showToast } from '@/stores/ui';

const CATEGORY_OPTIONS = EXPENSE_CATEGORIES.map((c) => ({ key: c.key, label: c.label, icon: c.iconName }));

interface ExpenseFormProps {
  /** Edit this expense; omit to add a new one. */
  existing?: Expense;
  /** Called after a save or delete — closes the screen. */
  onDone: () => void;
}

export function ExpenseForm({ existing, onDone }: ExpenseFormProps) {
  const { tokens } = useTheme();
  const addExpense = useDataStore((s) => s.addExpense);
  const updateExpense = useDataStore((s) => s.updateExpense);
  const deleteExpense = useDataStore((s) => s.deleteExpense);
  const restoreExpense = useDataStore((s) => s.restoreExpense);

  const initialDay = existing ? dayKeyOf(existing.date) : todayKey();
  const [amount, setAmount] = useState(existing ? amountInputFromPaisa(existing.amount) : '');
  const [category, setCategory] = useState(
    () => existing?.category ?? useDataStore.getState().lastExpenseCategory ?? 'food',
  );
  const [day, setDay] = useState(initialDay);
  const [description, setDescription] = useState(existing?.description ?? '');
  const [amountError, setAmountError] = useState<string | null>(null);

  const save = () => {
    const paisa = toPaisa(amount);
    if (paisa <= 0) {
      setAmountError('খরচের পরিমাণ লিখুন।');
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
        message: 'খরচ আপডেট হয়েছে',
        actionLabel: 'ফিরিয়ে নিন',
        onAction: () => updateExpense(existing.id, previous),
      });
    } else {
      const id = addExpense(values);
      onDone();
      showToast({
        message: `খরচ যোগ হয়েছে · ${formatTaka(paisa)}`,
        actionLabel: 'ফিরিয়ে নিন',
        onAction: () => deleteExpense(id),
      });
    }
  };

  const remove = async () => {
    if (!existing) return;
    const confirmed = await confirmDialog({
      title: 'খরচ ডিলিট করবেন?',
      message: 'এই খরচটি মুছে যাবে এবং মাসের হিসাব আবার গণনা হবে।',
      confirmLabel: 'ডিলিট',
      destructive: true,
    });
    if (!confirmed) return;
    deleteExpense(existing.id);
    onDone();
    showToast({
      message: 'খরচ ডিলিট হয়েছে',
      actionLabel: 'ফিরিয়ে নিন',
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
        <FieldLabel>ক্যাটাগরি</FieldLabel>
        <ChipSelect options={CATEGORY_OPTIONS} value={category} onChange={setCategory} accessibilityLabel="ক্যাটাগরি" />
      </View>
      <DateField value={day} onChange={setDay} />
      <Field
        label="বিবরণ (ঐচ্ছিক)"
        value={description}
        onChangeText={setDescription}
        placeholder="যেমন: বাজার ও খাবার"
        multiline
        maxLength={500}
      />
      <Button label={existing ? 'পরিবর্তন সেভ করুন' : 'খরচ সেভ করুন'} icon="checkmark" onPress={save} style={{ marginTop: 4 }} />
      {existing ? (
        <Button label="ডিলিট করুন" icon="trash-outline" variant="outline" color={tokens.expense} onPress={() => void remove()} />
      ) : null}
    </>
  );
}
