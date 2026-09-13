import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Text } from 'react-native';

import { ModalShell } from '@/components/modal-shell';
import { Button } from '@/components/ui/button';
import { ChipSelect } from '@/components/ui/chip-select';
import { Field } from '@/components/ui/field';
import { INCOME_SOURCES } from '@/constants/categories';
import { dayKeyOf, inputDateToIso, todayInputDate } from '@/lib/date';
import { toPaisa, toTaka } from '@/lib/money';
import { useTheme } from '@/providers/theme-provider';
import { useDataStore } from '@/stores/data';

export default function AddIncomeScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const addIncome = useDataStore((s) => s.addIncome);
  const updateIncome = useDataStore((s) => s.updateIncome);
  const deleteIncome = useDataStore((s) => s.deleteIncome);

  // Opened with ?id=… from a list → edit that entry. Snapshot it once so the form
  // doesn't flip to "not found" while the modal closes after a delete.
  const [existing] = useState(() =>
    id ? useDataStore.getState().incomes.find((i) => i.id === id && !i.isDeleted) : undefined,
  );
  const initialDate = existing ? dayKeyOf(existing.date) : todayInputDate();

  const [amount, setAmount] = useState(existing ? String(toTaka(existing.amount)) : '');
  const [source, setSource] = useState(existing?.source ?? 'salary');
  const [date, setDate] = useState(initialDate);
  const [note, setNote] = useState(existing?.note ?? '');

  const save = () => {
    const paisa = toPaisa(amount);
    if (paisa <= 0) {
      Alert.alert('পরিমাণ দিন', 'সঠিক পরিমাণ লিখুন।');
      return;
    }
    if (existing) {
      updateIncome(existing.id, {
        amount: paisa,
        source,
        // Keep the stored timestamp unless the day itself was changed.
        date: date === initialDate ? existing.date : inputDateToIso(date),
        note: note || null,
      });
    } else {
      addIncome({ amount: paisa, source, date: inputDateToIso(date), note: note || null });
    }
    router.back();
  };

  const confirmDelete = () => {
    if (!existing) return;
    Alert.alert('আয় ডিলিট করবেন?', 'এই আয়টি মুছে যাবে এবং মাসের হিসাব আবার গণনা হবে।', [
      { text: 'বাতিল', style: 'cancel' },
      {
        text: 'ডিলিট',
        style: 'destructive',
        onPress: () => {
          deleteIncome(existing.id);
          router.back();
        },
      },
    ]);
  };

  const label = { fontSize: 12.5, fontWeight: '600' as const, color: tokens.muted, marginLeft: 2, marginBottom: -6 };

  if (id && !existing) {
    return (
      <ModalShell title="আয় এডিট করুন">
        <Text style={{ color: tokens.muted, fontSize: 13 }}>এই আয়টি আর নেই — হয়তো আগেই ডিলিট হয়ে গেছে।</Text>
      </ModalShell>
    );
  }

  return (
    <ModalShell title={existing ? 'আয় এডিট করুন' : 'আয় যোগ করুন'}>
      <Field label="পরিমাণ" value={amount} onChangeText={setAmount} placeholder="0" keyboardType="numeric" prefix="৳" />
      <Text style={label}>উৎস</Text>
      <ChipSelect options={INCOME_SOURCES.map((s) => ({ key: s.key, label: s.label, icon: s.icon }))} value={source} onChange={setSource} />
      <Field label="তারিখ (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder="2026-07-05" keyboardType="numbers-and-punctuation" autoCapitalize="none" />
      <Field label="নোট (ঐচ্ছিক)" value={note} onChangeText={setNote} placeholder="যেমন: জুন মাসের বেতন" multiline />
      <Button label={existing ? 'পরিবর্তন সেভ করুন' : 'সেভ করুন'} onPress={save} style={{ marginTop: 6 }} />
      {existing ? (
        <Button label="ডিলিট করুন" leftGlyph="🗑" variant="outline" color={tokens.expense} onPress={confirmDelete} />
      ) : null}
    </ModalShell>
  );
}
