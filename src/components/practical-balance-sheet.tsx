import { useState } from 'react';
import { View } from 'react-native';

import { AmountText } from '@/components/ui/amount-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { ListGroup, ListRow } from '@/components/ui/list-row';
import { Text } from '@/components/ui/text';
import { textSize } from '@/constants/typography';
import { useDashboard } from '@/hooks/use-dashboard';
import { untrackedExpense } from '@/lib/calc';
import { relativeTime } from '@/lib/date';
import { useStrings } from '@/lib/i18n';
import { amountInputFromPaisa, formatTaka, sanitizeAmountInput, toPaisa } from '@/lib/money';
import { useTheme } from '@/providers/theme-provider';
import { useDataStore } from '@/stores/data';
import { showToast } from '@/stores/ui';

/** "হিসাব মেলানো": the balance the records add up to next to the cash, bank and mobile money actually counted. */
export function PracticalBalanceSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const title = useStrings().practical.title;
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} scroll gap={14}>
      {/* Remounts on every open, so an edit left half-done last time starts fresh. */}
      <SheetBody key={String(visible)} onClose={onClose} />
    </BottomSheet>
  );
}

function SheetBody({ onClose }: { onClose: () => void }) {
  const { tokens } = useTheme();
  const s = useStrings();
  const t = s.practical;
  const monthKey = useDataStore((s) => s.monthKey);
  const current = useDataStore((s) => s.practicals[s.monthKey]);
  const setPractical = useDataStore((s) => s.setPractical);
  const { snapshot } = useDashboard();

  const [editing, setEditing] = useState(!current);
  const [cash, setCash] = useState(current ? amountInputFromPaisa(current.cash) : '');
  const [bank, setBank] = useState(current ? amountInputFromPaisa(current.bank) : '');
  const [mfs, setMfs] = useState(current ? amountInputFromPaisa(current.mfs) : '');

  const draftTotal = toPaisa(cash || '0') + toPaisa(bank || '0') + toPaisa(mfs || '0');
  // While typing, reconcile against the draft — but not before anything has been typed.
  const practical = editing && (cash || bank || mfs) ? draftTotal : (current?.amount ?? null);
  const untracked = untrackedExpense(snapshot.theoretical, practical);
  const untrackedIsIncome = untracked < 0;

  const save = () => {
    setPractical(monthKey, { cash: toPaisa(cash || '0'), bank: toPaisa(bank || '0'), mfs: toPaisa(mfs || '0') });
    showToast({ message: t.saved });
    onClose();
  };

  const cancel = () => {
    if (!current) return onClose();
    setCash(amountInputFromPaisa(current.cash));
    setBank(amountInputFromPaisa(current.bank));
    setMfs(amountInputFromPaisa(current.mfs));
    setEditing(false);
  };

  return (
    <>
      <Text style={{ fontSize: textSize.sm, lineHeight: 19, color: tokens.muted, marginTop: -6 }}>
        {t.intro}
      </Text>

      <Card soft padding={16}>
        <ReconRow label={t.theoretical} value={formatTaka(snapshot.theoretical)} />
        <ReconRow label={t.minusActual} value={practical == null ? '—' : formatTaka(practical)} />
        <View style={{ height: 1, backgroundColor: tokens.line, marginVertical: 7 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: textSize.md, fontWeight: '700', color: tokens.ink }}>
            = {untrackedIsIncome ? s.balance.untrackedIncome : s.balance.untrackedExpense}
          </Text>
          <AmountText
            paisa={Math.abs(untracked)}
            size="lg"
            weight="700"
            color={untrackedIsIncome ? tokens.income : tokens.borrowed}
          />
        </View>
        <Text style={{ fontSize: textSize.sm, color: tokens.muted, marginTop: 6, lineHeight: 19 }}>
          {practical == null
            ? t.hintNone
            : untrackedIsIncome
              ? t.hintIncome
              : t.hintExpense}
        </Text>
      </Card>

      {editing || !current ? (
        <>
          <Field
            label={t.cash}
            value={cash}
            onChangeText={(v) => setCash(sanitizeAmountInput(v))}
            keyboardType="decimal-pad"
            prefix="৳"
            placeholder="0"
          />
          <Field
            label={t.bank}
            value={bank}
            onChangeText={(v) => setBank(sanitizeAmountInput(v))}
            keyboardType="decimal-pad"
            prefix="৳"
            placeholder="0"
          />
          <Field
            label={t.mfs}
            hint={t.mfsHint}
            value={mfs}
            onChangeText={(v) => setMfs(sanitizeAmountInput(v))}
            keyboardType="decimal-pad"
            prefix="৳"
            placeholder="0"
          />
          <Text style={{ fontSize: textSize.md, color: tokens.muted, marginLeft: 2 }}>
            {s.common.total}: <Text style={{ fontWeight: '700', color: tokens.ink }}>{formatTaka(draftTotal)}</Text>
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button label={s.common.cancel} variant="secondary" onPress={cancel} style={{ flex: 1 }} />
            <Button label={s.common.save} icon="checkmark" onPress={save} style={{ flex: 1 }} />
          </View>
        </>
      ) : (
        <>
          <ListGroup>
            <ListRow
              icon="cash-outline"
              tint={tokens.primary}
              title={t.cash}
              subtitle={t.cashSubtitle}
              trailing={<AmountText paisa={current.cash} color={tokens.ink} />}
            />
            <ListRow
              divider
              icon="business-outline"
              tint={tokens.lent}
              title={t.bank}
              subtitle={t.bankSubtitle}
              trailing={<AmountText paisa={current.bank} color={tokens.ink} />}
            />
            <ListRow
              divider
              icon="phone-portrait-outline"
              tint={tokens.borrowed}
              title={t.mfs}
              subtitle={t.mfsSubtitle}
              trailing={<AmountText paisa={current.mfs} color={tokens.ink} />}
            />
          </ListGroup>
          <Text style={{ fontSize: textSize.sm, color: tokens.muted, textAlign: 'center' }}>
            {t.countedAt(relativeTime(current.countedAt))}
          </Text>
          <Button label={t.update} icon="create-outline" onPress={() => setEditing(true)} />
        </>
      )}
    </>
  );
}

function ReconRow({ label, value }: { label: string; value: string }) {
  const { tokens } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 5 }}>
      <Text style={{ fontSize: textSize.sm, color: tokens.muted }}>{label}</Text>
      <Text style={{ fontSize: textSize.sm, fontWeight: '600', color: tokens.ink, fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );
}
