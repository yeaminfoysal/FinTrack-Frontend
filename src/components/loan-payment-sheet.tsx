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
import { dayKeyToIso, dayMonth, todayKey } from '@/lib/date';
import { useStrings } from '@/lib/i18n';
import { amountInputFromPaisa, formatTaka, toPaisa } from '@/lib/money';
import type { Loan } from '@/lib/types';
import { useTheme } from '@/providers/theme-provider';
import { useDataStore } from '@/stores/data';
import { showToast } from '@/stores/ui';

export function LoanPaymentSheet({ loan, onClose }: { loan: Loan | null; onClose: () => void }) {
  const lent = loan?.direction === 'LENT';
  const t = useStrings().loanPayment;
  return (
    <BottomSheet
      visible={loan != null}
      onClose={onClose}
      title={lent ? t.lentTitle : t.borrowedTitle}
      scroll
      gap={14}>
      {/* Remounts per loan, so an amount typed for one never carries over to another. */}
      {loan ? <SheetBody key={loan.id} loan={loan} onClose={onClose} /> : null}
    </BottomSheet>
  );
}

function SheetBody({ loan, onClose }: { loan: Loan; onClose: () => void }) {
  const { tokens } = useTheme();
  const s = useStrings();
  const t = s.loanPayment;
  const allPayments = useDataStore((s) => s.loanPayments);
  const addLoanPayment = useDataStore((s) => s.addLoanPayment);
  const deleteLoanPayment = useDataStore((s) => s.deleteLoanPayment);
  const restoreLoanPayment = useDataStore((s) => s.restoreLoanPayment);

  const lent = loan.direction === 'LENT';
  const color = lent ? tokens.lent : tokens.borrowed;
  const backVerb = lent ? t.lentVerb : t.borrowedVerb;

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
      setAmountError(t.amountRequired);
      return;
    }
    if (typed > remaining) {
      setAmountError(t.tooMuch(formatTaka(remaining)));
      return;
    }
    const id = addLoanPayment({ loanId: loan.id, amount: typed, date: dayKeyToIso(day), note: note.trim() || null });
    onClose();
    showToast({
      message:
        typed >= remaining
          ? t.settledToast(loan.personName, lent ? t.wholeLent : t.wholeBorrowed)
          : t.partToast(formatTaka(typed), backVerb, formatTaka(remaining - typed)),
      actionLabel: s.common.undo,
      onAction: () => deleteLoanPayment(id),
    });
  };

  const removePayment = (id: string, paisa: number) => {
    // The sheet is a modal and a toast would sit behind it, so close before undoing is offered.
    onClose();
    deleteLoanPayment(id);
    showToast({
      message: t.removedToast(formatTaka(paisa)),
      actionLabel: s.common.undo,
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
          <Text style={{ fontSize: textSize.sm, color: tokens.muted }}>{t.totalOf(formatTaka(loan.amount))}</Text>
        </View>
        <View
          accessible
          accessibilityLabel={t.progressA11y(formatTaka(paid), backVerb, formatTaka(remaining))}
          style={{ height: 9, borderRadius: 5, overflow: 'hidden', backgroundColor: tokens.chip }}>
          <View style={{ width: `${paidPct}%`, height: '100%', backgroundColor: color }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
          <Text style={{ fontSize: textSize.sm, color: tokens.muted }}>
            {t.paidLine(backVerb, formatTaka(paid))}
          </Text>
          <Text style={{ fontSize: textSize.sm, color: tokens.muted }}>
            {t.remainingPrefix}
            <Text style={{ fontWeight: '700', color }}>{formatTaka(remaining)}</Text>
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
            label={lent ? t.howMuchLent : t.howMuchBorrowed}
            error={amountError}
            accent={color}
          />
          {typed !== remaining ? (
            <Button
              label={t.whole(formatTaka(remaining))}
              icon="checkmark-done"
              variant="secondary"
              size="sm"
              onPress={() => {
                setAmount(amountInputFromPaisa(remaining));
                setAmountError(null);
              }}
            />
          ) : null}
          <DateField value={day} onChange={setDay} label={t.when} />
          <Field label={s.ui.noteLabel} value={note} onChangeText={setNote} placeholder={t.notePlaceholder} maxLength={500} />
          <Button label={s.common.save} icon="checkmark" fill={lent ? tokens.lentFill : tokens.borrowedFill} onPress={save} />
        </>
      ) : (
        <Text style={{ fontSize: textSize.sm, lineHeight: 20, color: tokens.muted, marginLeft: 2 }}>
          {t.nothingLeft}
        </Text>
      )}

      {payments.length > 0 ? (
        <View style={{ gap: 8, marginTop: 2 }}>
          <Text
            accessibilityRole="header"
            style={{ fontSize: textSize.sm, fontWeight: '700', color: tokens.muted, marginLeft: 2 }}>
            {t.history}
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
                  {dayMonth(p.date)}
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
                label={t.removeEntry(formatTaka(p.amount))}
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
