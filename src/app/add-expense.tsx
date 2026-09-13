import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Text } from 'react-native';

import { ModalShell } from '@/components/modal-shell';
import { Button } from '@/components/ui/button';
import { ChipSelect } from '@/components/ui/chip-select';
import { Field } from '@/components/ui/field';
import { EXPENSE_CATEGORIES } from '@/constants/categories';
import { dayKeyOf, inputDateToIso, todayInputDate } from '@/lib/date';
import { toPaisa, toTaka } from '@/lib/money';
import { useTheme } from '@/providers/theme-provider';
import { useDataStore } from '@/stores/data';

export default function AddExpenseScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const addExpense = useDataStore((s) => s.addExpense);
  const updateExpense = useDataStore((s) => s.updateExpense);
  const deleteExpense = useDataStore((s) => s.deleteExpense);

  // Opened with ?id=… from a list → edit that entry. Snapshot it once so the form
  // doesn't flip to "not found" while the modal closes after a delete.
  const [existing] = useState(() =>
    id ? useDataStore.getState().expenses.find((e) => e.id === id && !e.isDeleted) : undefined,
  );
  const initialDate = existing ? dayKeyOf(existing.date) : todayInputDate();

  const [amount, setAmount] = useState(existing ? String(toTaka(existing.amount)) : '');
  const [category, setCategory] = useState(existing?.category ?? 'food');
  const [date, setDate] = useState(initialDate);
  const [description, setDescription] = useState(existing?.description ?? '');

  const save = () => {
    const paisa = toPaisa(amount);
    if (paisa <= 0) {
      Alert.alert('পরিমাণ দিন', 'সঠিক পরিমাণ লিখুন।');
      return;
    }
    if (existing) {
      updateExpense(existing.id, {
        amount: paisa,
        category,
        // Keep the stored timestamp unless the day itself was changed.
        date: date === initialDate ? existing.date : inputDateToIso(date),
        description: description || null,
      });
    } else {
      addExpense({ amount: paisa, category, date: inputDateToIso(date), description: description || null });
    }
    router.back();
  };

  const confirmDelete = () => {
    if (!existing) return;
    Alert.alert('খরচ ডিলিট করবেন?', 'এই খরচটি মুছে যাবে এবং মাসের হিসাব আবার গণনা হবে।', [
      { text: 'বাতিল', style: 'cancel' },
      {
        text: 'ডিলিট',
        style: 'destructive',
        onPress: () => {
          deleteExpense(existing.id);
          router.back();
        },
      },
    ]);
  };

  const label = { fontSize: 12.5, fontWeight: '600' as const, color: tokens.muted, marginLeft: 2, marginBottom: -6 };

  if (id && !existing) {
    return (
      <ModalShell title="খরচ এডিট করুন">
        <Text style={{ color: tokens.muted, fontSize: 13 }}>এই খরচটি আর নেই — হয়তো আগেই ডিলিট হয়ে গেছে।</Text>
      </ModalShell>
    );
  }

  return (
    <ModalShell title={existing ? 'খরচ এডিট করুন' : 'খরচ যোগ করুন'}>
      <Field label="পরিমাণ" value={amount} onChangeText={setAmount} placeholder="0" keyboardType="numeric" prefix="৳" />
      <Text style={label}>ক্যাটাগরি</Text>
      <ChipSelect options={EXPENSE_CATEGORIES.map((c) => ({ key: c.key, label: c.label, icon: c.icon }))} value={category} onChange={setCategory} />
      <Field label="তারিখ (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder="2026-07-05" keyboardType="numbers-and-punctuation" autoCapitalize="none" />
      <Field label="বিবরণ (ঐচ্ছিক)" value={description} onChangeText={setDescription} placeholder="যেমন: বাজার ও খাবার" multiline />
      <Button label={existing ? 'পরিবর্তন সেভ করুন' : 'সেভ করুন'} variant="danger" onPress={save} style={{ marginTop: 6 }} />
      {existing ? (
        <Button label="ডিলিট করুন" leftGlyph="🗑" variant="outline" color={tokens.expense} onPress={confirmDelete} />
      ) : null}
    </ModalShell>
  );
}
