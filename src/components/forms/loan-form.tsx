import { useState } from 'react';
import { View } from 'react-native';

import { LoanPaymentSheet } from '@/components/loan-payment-sheet';
import { AmountInput } from '@/components/ui/amount-input';
import { Button } from '@/components/ui/button';
import { DateField, DueDateField } from '@/components/ui/date-field';
import { Field, FieldLabel } from '@/components/ui/field';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { textSize } from '@/constants/typography';
import { loanOutstanding, paidOnLoan, paymentsOf } from '@/lib/calc';
import { dayKeyOf, dayKeyToIso, fullDateBn, todayKey } from '@/lib/date';
import { amountInputFromPaisa, formatTaka, toPaisa } from '@/lib/money';
import type { Loan, LoanDirection } from '@/lib/types';
import { useTheme } from '@/providers/theme-provider';
import { useDataStore } from '@/stores/data';
import { confirmDialog, showToast } from '@/stores/ui';

const DIRECTION_OPTIONS: { value: LoanDirection; label: string }[] = [
  { value: 'LENT', label: 'ধার দেওয়া' },
  { value: 'BORROWED', label: 'ধার নেওয়া' },
];

interface LoanFormProps {
  /** Edit this loan; omit to add a new one. */
  existing?: Loan;
  initialDirection?: LoanDirection;
  /** Called after a save, delete or reopen — closes the screen. */
  onDone: () => void;
}

export function LoanForm({ existing, initialDirection = 'LENT', onDone }: LoanFormProps) {
  const { tokens } = useTheme();
  const addLoan = useDataStore((s) => s.addLoan);
  const updateLoan = useDataStore((s) => s.updateLoan);
  const deleteLoan = useDataStore((s) => s.deleteLoan);
  const restoreLoan = useDataStore((s) => s.restoreLoan);
  const settleLoan = useDataStore((s) => s.settleLoan);
  const unsettleLoan = useDataStore((s) => s.unsettleLoan);
  const loanPayments = useDataStore((s) => s.loanPayments);

  const initialDay = existing ? dayKeyOf(existing.date) : todayKey();
  const [direction, setDirection] = useState<LoanDirection>(existing?.direction ?? initialDirection);
  const [personName, setPersonName] = useState(existing?.personName ?? '');
  const [amount, setAmount] = useState(existing ? amountInputFromPaisa(existing.amount) : '');
  const [day, setDay] = useState(initialDay);
  const [dueDay, setDueDay] = useState<string | null>(existing?.dueDate ? dayKeyOf(existing.dueDate) : null);
  const [note, setNote] = useState(existing?.note ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [paymentsOpen, setPaymentsOpen] = useState(false);

  const lent = direction === 'LENT';
  // A legacy row carries its settle in the status; new ones are settled by their repayments.
  const legacySettled = existing?.status === 'SETTLED';
  const paid = existing ? paidOnLoan(existing, loanPayments) : 0;
  const remaining = existing ? loanOutstanding(existing, loanPayments) : 0;
  const settled = existing != null && remaining <= 0;
  const hasPayments = existing != null && paymentsOf(loanPayments, existing.id).length > 0;

  const save = () => {
    const name = personName.trim();
    const paisa = toPaisa(amount);
    setNameError(name ? null : 'ব্যক্তির নাম লিখুন।');
    setAmountError(paisa > 0 ? null : 'লোনের পরিমাণ লিখুন।');
    if (!name || paisa <= 0) return;

    // Keep the stored timestamp unless the day itself was changed.
    const date = existing && day === initialDay ? existing.date : dayKeyToIso(day);
    const values = {
      direction,
      personName: name,
      amount: paisa,
      date,
      note: note.trim() || null,
      dueDate: dueDay ? dayKeyToIso(dueDay) : null,
    };

    if (existing) {
      const previous = {
        direction: existing.direction,
        personName: existing.personName,
        amount: existing.amount,
        date: existing.date,
        note: existing.note,
        dueDate: existing.dueDate,
      };
      updateLoan(existing.id, values);
      onDone();
      showToast({
        message: 'লোন আপডেট হয়েছে',
        actionLabel: 'ফিরিয়ে নিন',
        onAction: () => updateLoan(existing.id, previous),
      });
    } else {
      const id = addLoan(values);
      onDone();
      showToast({
        message: `${lent ? 'ধার দেওয়া' : 'ধার নেওয়া'} যোগ হয়েছে · ${formatTaka(paisa)}`,
        actionLabel: 'ফিরিয়ে নিন',
        onAction: () => deleteLoan(id),
      });
    }
  };

  const reopen = () => {
    if (!existing) return;
    const settledDate = existing.settledDate ?? undefined;
    unsettleLoan(existing.id);
    onDone();
    showToast({
      message: 'লোন আবার চলমান করা হয়েছে',
      actionLabel: 'ফিরিয়ে নিন',
      onAction: () => settleLoan(existing.id, settledDate),
    });
  };

  const remove = async () => {
    if (!existing) return;
    const confirmed = await confirmDialog({
      title: 'লোন ডিলিট করবেন?',
      message: `${existing.personName} — ${formatTaka(existing.amount)} এর হিসাব মুছে যাবে।`,
      confirmLabel: 'ডিলিট',
      destructive: true,
    });
    if (!confirmed) return;
    deleteLoan(existing.id);
    onDone();
    showToast({
      message: 'লোন ডিলিট হয়েছে',
      actionLabel: 'ফিরিয়ে নিন',
      onAction: () => restoreLoan(existing.id),
    });
  };

  return (
    <>
      <View style={{ gap: 7 }}>
        <FieldLabel>ধরন</FieldLabel>
        <Segmented options={DIRECTION_OPTIONS} value={direction} onChange={setDirection} accessibilityLabel="লোনের ধরন" />
        <Text style={{ fontSize: textSize.sm, lineHeight: 18, color: tokens.muted, marginLeft: 2 }}>
          {lent
            ? 'আপনি কাউকে টাকা দিয়েছেন — সে আপনাকে ফেরত দেবে (পাওনা)।'
            : 'আপনি কারো থেকে টাকা নিয়েছেন — আপনাকে ফেরত দিতে হবে (দেনা)। এটা আয় নয়।'}
        </Text>
      </View>
      <Field
        label={lent ? 'কাকে দিয়েছেন' : 'কার থেকে নিয়েছেন'}
        value={personName}
        onChangeText={(value) => {
          setPersonName(value);
          setNameError(null);
        }}
        placeholder="যেমন: করিম উদ্দিন"
        autoCapitalize="words"
        maxLength={120}
        autoFocus={!existing}
        error={nameError}
      />
      <AmountInput
        value={amount}
        onChangeText={(value) => {
          setAmount(value);
          setAmountError(null);
        }}
        error={amountError}
        accent={lent ? tokens.lent : tokens.borrowed}
      />
      <DateField value={day} onChange={setDay} />
      <DueDateField
        value={dueDay}
        onChange={setDueDay}
        hint={lent ? 'কবে ফেরত পাওয়ার কথা — দিলে মনে করিয়ে দেওয়া যাবে।' : 'কবে শোধ করার কথা — দিলে মনে করিয়ে দেওয়া যাবে।'}
      />
      <Field label="নোট (ঐচ্ছিক)" value={note} onChangeText={setNote} placeholder="যেমন: জরুরি দরকারে" multiline maxLength={500} />
      {existing && paid > 0 ? (
        <Text style={{ fontSize: textSize.sm, lineHeight: 19, color: tokens.muted, marginLeft: 2 }}>
          {lent ? 'ফেরত পেয়েছেন' : 'শোধ করেছেন'} <Text style={{ fontWeight: '700', color: tokens.ink }}>{formatTaka(paid)}</Text>
          {settled ? '' : ` · বাকি ${formatTaka(remaining)}`}
        </Text>
      ) : null}
      {settled && legacySettled && existing?.settledDate ? (
        <Text style={{ fontSize: textSize.sm, color: tokens.muted, marginLeft: 2 }}>
          {existing.direction === 'LENT' ? 'ফেরত পাওয়া গেছে' : 'শোধ করা হয়েছে'} · {fullDateBn(existing.settledDate)}
        </Text>
      ) : null}
      <Button
        label={existing ? 'পরিবর্তন সেভ করুন' : 'লোন সেভ করুন'}
        icon="checkmark"
        fill={lent ? tokens.lentFill : tokens.borrowedFill}
        onPress={save}
        style={{ marginTop: 4 }}
      />
      {existing && !legacySettled ? (
        <Button
          label={hasPayments ? 'পরিশোধের হিসাব' : lent ? 'ফেরত পেয়েছি' : 'শোধ করেছি'}
          icon={hasPayments ? 'list-outline' : 'checkmark'}
          variant="secondary"
          onPress={() => setPaymentsOpen(true)}
        />
      ) : null}
      {legacySettled ? <Button label="আবার চলমান করুন" icon="arrow-undo-outline" variant="secondary" onPress={reopen} /> : null}
      {existing ? (
        <Button label="ডিলিট করুন" icon="trash-outline" variant="outline" color={tokens.expense} onPress={() => void remove()} />
      ) : null}
      <LoanPaymentSheet loan={paymentsOpen && existing ? existing : null} onClose={() => setPaymentsOpen(false)} />
    </>
  );
}
