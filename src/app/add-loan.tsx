import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Text } from 'react-native';

import { ModalShell } from '@/components/modal-shell';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Segmented } from '@/components/ui/segmented';
import { inputDateToIso, todayInputDate } from '@/lib/date';
import { toPaisa } from '@/lib/money';
import type { LoanDirection } from '@/lib/types';
import { useTheme } from '@/providers/theme-provider';
import { useDataStore } from '@/stores/data';

export default function AddLoanScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const addLoan = useDataStore((s) => s.addLoan);

  const [direction, setDirection] = useState<LoanDirection>('LENT');
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayInputDate());
  const [note, setNote] = useState('');

  const save = () => {
    const paisa = toPaisa(amount);
    if (!personName.trim()) {
      Alert.alert('নাম দিন', 'ব্যক্তির নাম লিখুন।');
      return;
    }
    if (paisa <= 0) {
      Alert.alert('পরিমাণ দিন', 'সঠিক পরিমাণ লিখুন।');
      return;
    }
    addLoan({ direction, personName: personName.trim(), amount: paisa, date: inputDateToIso(date), note: note || null });
    router.back();
  };

  const label = { fontSize: 12.5, fontWeight: '600' as const, color: tokens.muted, marginLeft: 2, marginBottom: -6 };

  return (
    <ModalShell title="নতুন লোন">
      <Text style={label}>ধরন</Text>
      <Segmented
        options={[
          { value: 'LENT', label: 'ধার দেওয়া' },
          { value: 'BORROWED', label: 'ধার নেওয়া' },
        ]}
        value={direction}
        onChange={setDirection}
      />
      <Field label="ব্যক্তির নাম" value={personName} onChangeText={setPersonName} placeholder="যেমন: করিম উদ্দিন" autoCapitalize="words" />
      <Field label="পরিমাণ" value={amount} onChangeText={setAmount} placeholder="0" keyboardType="numeric" prefix="৳" />
      <Field label="তারিখ (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder="2026-07-05" keyboardType="numbers-and-punctuation" autoCapitalize="none" />
      <Field label="নোট (ঐচ্ছিক)" value={note} onChangeText={setNote} placeholder="যেমন: জরুরি দরকারে" multiline />
      <Button
        label="সেভ করুন"
        color={direction === 'LENT' ? tokens.lent : tokens.borrowed}
        onPress={save}
        style={{ marginTop: 6, backgroundColor: direction === 'LENT' ? tokens.lent : tokens.borrowed }}
        variant="primary"
      />
    </ModalShell>
  );
}
