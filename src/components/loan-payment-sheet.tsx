/**
 * Recording money coming back on a loan — all of it, or a part. Settling is just a
 * repayment for everything left, so both go through the same sheet and the same history.
 */
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { AmountInput } from '@/components/ui/amount-input';
import { AmountText } from '@/components/ui/amount-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DateField } from '@/components/ui/date-field';
import { Field } from '@/components/ui/field';
import { IconButton } from '@/components/ui/icon-button';
import { Text } from '@/components/ui/text';
import { textSize } from '@/constants/typography';
import { loanOutstanding, paidOnLoan, paymentsOf } from '@/lib/calc';
import { dayKeyToIso, dayMonthBn, todayKey } from '@/lib/date';
import { amountInputFromPaisa, formatTaka, toPaisa } from '@/lib/money';
import type { Loan } from '@/lib/types';
import { useTheme } from '@/providers/theme-provider';
import { useDataStore } from '@/stores/data';
import { showToast } from '@/stores/ui';

export function LoanPaymentSheet({ loan, onClose }: { loan: Loan | null; onClose: () => void }) {
  const lent = loan?.direction === 'LENT';
  return (
    <BottomSheet
      visible={loan != null}
      onClose={onClose}
      title={lent ? 'ফেরত পেয়েছেন?' : 'শোধ করেছেন?'}
      scroll
      gap={14}>
      {/* Remounts per loan, so an amount typed for one never carries over to another. */}
      {loan ? <SheetBody key={loan.id} loan={loan} onClose={onClose} /> : null}
    </BottomSheet>
  );
}

function SheetBody({ loan, onClose }: { loan: Loan; onClose: () => void }) {
  const { tokens } = useTheme();
  const allPayments = useDataStore((s) => s.loanPayments);
  const addLoanPayment = useDataStore((s) => s.addLoanPayment);
  const deleteLoanPayment = useDataStore((s) => s.deleteLoanPayment);
  const restoreLoanPayment = useDataStore((s) => s.restoreLoanPayment);

  const lent = loan.direction === 'LENT';
  const color = lent ? tokens.lent : tokens.borrowed;
  const backVerb = lent ? 'ফেরত পেয়েছি' : 'শোধ করেছি';

  const payments = useMemo(() => paymentsOf(allPayments, loan.id), [allPayments, loan.id]);
  const paid = paidOnLoan(loan, allPayments);
  const remaining = loanOutstanding(loan, allPayments);
  const paidPct = loan.amount > 0 ? Math.min(100, Math.round((paid / loan.amount) * 100)) : 0;

  const [amount, setAmount] = useState(() => amountInputFromPaisa(remaining));
  const [day, setDay] = useState(todayKey());
  const [note, setNote] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);

  const typed = toPaisa(amount || '0');

  const save = () => {
    if (typed <= 0) {
      setAmountError('কত টাকা এসেছে লিখুন।');
      return;
    }
    if (typed > remaining) {
      setAmountError(`বাকি আছে ${formatTaka(remaining)} — এর বেশি হতে পারে না।`);
      return;
    }
    const id = addLoanPayment({ loanId: loan.id, amount: typed, date: dayKeyToIso(day), note: note.trim() || null });
    onClose();
    showToast({
      message:
        typed >= remaining
          ? `${loan.personName} — ${lent ? 'পুরো টাকা ফেরত পাওয়া' : 'পুরো দেনা শোধ'} হয়েছে`
          : `${formatTaka(typed)} ${backVerb} · বাকি ${formatTaka(remaining - typed)}`,
      actionLabel: 'ফিরিয়ে নিন',
      onAction: () => deleteLoanPayment(id),
    });
  };

  const removePayment = (id: string, paisa: number) => {
    // The sheet is a modal and a toast would sit behind it, so close before undoing is offered.
    onClose();
    deleteLoanPayment(id);
    showToast({
      message: `${formatTaka(paisa)}-এর হিসাব মুছে ফেলা হয়েছে`,
      actionLabel: 'ফিরিয়ে নিন',
      onAction: () => restoreLoanPayment(id),
    });
  };

  return (
    <>
      <Card soft padding={15} style={{ gap: 9 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text numberOfLines={1} style={{ flex: 1, fontSize: textSize.md, fontWeight: '700', color: tokens.ink }}>
            {loan.personName}
          </Text>
          <Text style={{ fontSize: textSize.sm, color: tokens.muted }}>মোট {formatTaka(loan.amount)}</Text>
        </View>
        <View
          accessible
          accessibilityLabel={`${formatTaka(paid)} ${backVerb}, বাকি ${formatTaka(remaining)}`}
          style={{ height: 9, borderRadius: 5, overflow: 'hidden', backgroundColor: tokens.chip }}>
          <View style={{ width: `${paidPct}%`, height: '100%', backgroundColor: color }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
          <Text style={{ fontSize: textSize.sm, color: tokens.muted }}>
            {backVerb} <Text style={{ fontWeight: '700', color: tokens.ink }}>{formatTaka(paid)}</Text>
          </Text>
          <Text style={{ fontSize: textSize.sm, color: tokens.muted }}>
            বাকি <Text style={{ fontWeight: '700', color }}>{formatTaka(remaining)}</Text>
          </Text>
        </View>
      </Card>

      {remaining > 0 ? (
        <>
          <AmountInput
            value={amount}
            onChangeText={(value) => {
              setAmount(value);
              setAmountError(null);
            }}
            label={lent ? 'কত ফেরত পেলেন' : 'কত শোধ করলেন'}
            error={amountError}
            accent={color}
          />
          {typed !== remaining ? (
            <Button
              label={`পুরোটা — ${formatTaka(remaining)}`}
              icon="checkmark-done"
              variant="secondary"
              size="sm"
              onPress={() => {
                setAmount(amountInputFromPaisa(remaining));
                setAmountError(null);
              }}
            />
          ) : null}
          <DateField value={day} onChange={setDay} label="কবে" />
          <Field label="নোট (ঐচ্ছিক)" value={note} onChangeText={setNote} placeholder="যেমন: প্রথম কিস্তি" maxLength={500} />
          <Button label="সেভ করুন" icon="checkmark" fill={lent ? tokens.lentFill : tokens.borrowedFill} onPress={save} />
        </>
      ) : (
        <Text style={{ fontSize: textSize.sm, lineHeight: 20, color: tokens.muted, marginLeft: 2 }}>
          এই লোনের কিছু বাকি নেই। ভুল হলে নিচের হিসাব থেকে মুছে দিলে লোনটি আবার চলমান হয়ে যাবে।
        </Text>
      )}

      {payments.length > 0 ? (
        <View style={{ gap: 8, marginTop: 2 }}>
          <Text
            accessibilityRole="header"
            style={{ fontSize: textSize.sm, fontWeight: '700', color: tokens.muted, marginLeft: 2 }}>
            আগের হিসাব
          </Text>
          {payments.map((p) => (
            <View
              key={p.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingVertical: 8,
                paddingLeft: 12,
                paddingRight: 4,
                borderRadius: 12,
                backgroundColor: tokens.surface,
                borderColor: tokens.line,
                borderWidth: 1,
              }}>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ fontSize: textSize.md, fontWeight: '600', color: tokens.ink }}>
                  {dayMonthBn(p.date)}
                </Text>
                {p.note ? (
                  <Text numberOfLines={1} style={{ fontSize: textSize.sm, color: tokens.muted }}>
                    {p.note}
                  </Text>
                ) : null}
              </View>
              <AmountText paisa={p.amount} weight="700" color={color} />
              <IconButton
                icon="trash-outline"
                label={`${formatTaka(p.amount)}-এর হিসাব মুছুন`}
                variant="plain"
                color={tokens.expense}
                onPress={() => removePayment(p.id, p.amount)}
              />
            </View>
          ))}
        </View>
      ) : null}
    </>
  );
}
