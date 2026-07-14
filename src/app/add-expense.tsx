import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Text } from 'react-native';

import { ModalShell } from '@/components/modal-shell';
import { Button } from '@/components/ui/button';
import { ChipSelect } from '@/components/ui/chip-select';
import { Field } from '@/components/ui/field';
import { EXPENSE_CATEGORIES } from '@/constants/categories';
import { inputDateToIso, todayInputDate } from '@/lib/date';
import { toPaisa } from '@/lib/money';
import { useTheme } from '@/providers/theme-provider';
import { useDataStore } from '@/stores/data';

export default function AddExpenseScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const addExpense = useDataStore((s) => s.addExpense);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [date, setDate] = useState(todayInputDate());
  const [description, setDescription] = useState('');

  const save = () => {
    const paisa = toPaisa(amount);
    if (paisa <= 0) {
      Alert.alert('পরিমাণ দিন', 'সঠিক পরিমাণ লিখুন।');
      return;
    }
    addExpense({ amount: paisa, category, date: inputDateToIso(date), description: description || null });
    router.back();
  };

  const label = { fontSize: 12.5, fontWeight: '600' as const, color: tokens.muted, marginLeft: 2, marginBottom: -6 };

  return (
    <ModalShell title="খরচ যোগ করুন">
      <Field label="পরিমাণ" value={amount} onChangeText={setAmount} placeholder="0" keyboardType="numeric" prefix="৳" />
      <Text style={label}>ক্যাটাগরি</Text>
      <ChipSelect options={EXPENSE_CATEGORIES.map((c) => ({ key: c.key, label: c.label, icon: c.icon }))} value={category} onChange={setCategory} />
      <Field label="তারিখ (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder="2026-07-05" keyboardType="numbers-and-punctuation" autoCapitalize="none" />
      <Field label="বিবরণ (ঐচ্ছিক)" value={description} onChangeText={setDescription} placeholder="যেমন: বাজার ও খাবার" multiline />
      <Button label="সেভ করুন" variant="danger" onPress={save} style={{ marginTop: 6 }} />
    </ModalShell>
  );
}
