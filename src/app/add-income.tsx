import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Text } from 'react-native';

import { ModalShell } from '@/components/modal-shell';
import { Button } from '@/components/ui/button';
import { ChipSelect } from '@/components/ui/chip-select';
import { Field } from '@/components/ui/field';
import { INCOME_SOURCES } from '@/constants/categories';
import { inputDateToIso, todayInputDate } from '@/lib/date';
import { toPaisa } from '@/lib/money';
import { useTheme } from '@/providers/theme-provider';
import { useDataStore } from '@/stores/data';

export default function AddIncomeScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const addIncome = useDataStore((s) => s.addIncome);

  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('salary');
  const [date, setDate] = useState(todayInputDate());
  const [note, setNote] = useState('');

  const save = () => {
    const paisa = toPaisa(amount);
    if (paisa <= 0) {
      Alert.alert('পরিমাণ দিন', 'সঠিক পরিমাণ লিখুন।');
      return;
    }
    addIncome({ amount: paisa, source, date: inputDateToIso(date), note: note || null });
    router.back();
  };

  const label = { fontSize: 12.5, fontWeight: '600' as const, color: tokens.muted, marginLeft: 2, marginBottom: -6 };

  return (
    <ModalShell title="আয় যোগ করুন">
      <Field label="পরিমাণ" value={amount} onChangeText={setAmount} placeholder="0" keyboardType="numeric" prefix="৳" />
      <Text style={label}>উৎস</Text>
      <ChipSelect options={INCOME_SOURCES.map((s) => ({ key: s.key, label: s.label, icon: s.icon }))} value={source} onChange={setSource} />
      <Field label="তারিখ (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder="2026-07-05" keyboardType="numbers-and-punctuation" autoCapitalize="none" />
      <Field label="নোট (ঐচ্ছিক)" value={note} onChangeText={setNote} placeholder="যেমন: জুন মাসের বেতন" multiline />
      <Button label="সেভ করুন" onPress={save} style={{ marginTop: 6 }} />
    </ModalShell>
  );
}
