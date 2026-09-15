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
import { relativeTimeBn } from '@/lib/date';
import { amountInputFromPaisa, formatTaka, sanitizeAmountInput, toPaisa } from '@/lib/money';
import { useTheme } from '@/providers/theme-provider';
import { useDataStore } from '@/stores/data';
import { showToast } from '@/stores/ui';

/** "হিসাব মেলানো": the balance the records add up to next to the cash, bank and mobile money actually counted. */
export function PracticalBalanceSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="হিসাব মেলানো" scroll gap={14}>
      {/* Remounts on every open, so an edit left half-done last time starts fresh. */}
      <SheetBody key={String(visible)} onClose={onClose} />
    </BottomSheet>
  );
}

function SheetBody({ onClose }: { onClose: () => void }) {
  const { tokens } = useTheme();
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
    showToast({ message: 'ব্যালেন্স আপডেট হয়েছে' });
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
        হিসাব অনুযায়ী যত থাকার কথা, আর বাস্তবে হাতে, ব্যাংকে ও মোবাইল ব্যাংকিংয়ে যত আছে — এই দুইয়ের পার্থক্যই হিসাবের বাইরের খরচ।
      </Text>

      <Card soft padding={16}>
        <ReconRow label="হিসাব অনুযায়ী থাকার কথা" value={formatTaka(snapshot.theoretical)} />
        <ReconRow label="− বাস্তবে আছে" value={practical == null ? '—' : formatTaka(practical)} />
        <View style={{ height: 1, backgroundColor: tokens.line, marginVertical: 7 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: textSize.md, fontWeight: '700', color: tokens.ink }}>
            = {untrackedIsIncome ? 'আনট্র্যাকড আয়' : 'আনট্র্যাকড খরচ'}
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
            ? 'বাস্তবে কত আছে দিলে লেখা হয়নি এমন খরচ এখানে ধরা পড়বে।'
            : untrackedIsIncome
              ? 'লেখা হয়নি এমন টাকা হাতে এসেছে।'
              : 'যে টাকা খরচ হয়েছে কিন্তু লেখা হয়নি।'}
        </Text>
      </Card>

      {editing || !current ? (
        <>
          <Field
            label="নগদ"
            value={cash}
            onChangeText={(v) => setCash(sanitizeAmountInput(v))}
            keyboardType="decimal-pad"
            prefix="৳"
            placeholder="0"
          />
          <Field
            label="ব্যাংক অ্যাকাউন্ট"
            value={bank}
            onChangeText={(v) => setBank(sanitizeAmountInput(v))}
            keyboardType="decimal-pad"
            prefix="৳"
            placeholder="0"
          />
          <Field
            label="মোবাইল ব্যাংকিং"
            hint="বিকাশ, নগদ, রকেট মিলিয়ে"
            value={mfs}
            onChangeText={(v) => setMfs(sanitizeAmountInput(v))}
            keyboardType="decimal-pad"
            prefix="৳"
            placeholder="0"
          />
          <Text style={{ fontSize: textSize.md, color: tokens.muted, marginLeft: 2 }}>
            মোট: <Text style={{ fontWeight: '700', color: tokens.ink }}>{formatTaka(draftTotal)}</Text>
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button label="বাতিল" variant="secondary" onPress={cancel} style={{ flex: 1 }} />
            <Button label="সেভ করুন" icon="checkmark" onPress={save} style={{ flex: 1 }} />
          </View>
        </>
      ) : (
        <>
          <ListGroup>
            <ListRow
              icon="cash-outline"
              tint={tokens.primary}
              title="নগদ"
              subtitle="হাতে আছে"
              trailing={<AmountText paisa={current.cash} color={tokens.ink} />}
            />
            <ListRow
              divider
              icon="business-outline"
              tint={tokens.lent}
              title="ব্যাংক অ্যাকাউন্ট"
              subtitle="সেভিংস / কারেন্ট অ্যাকাউন্ট"
              trailing={<AmountText paisa={current.bank} color={tokens.ink} />}
            />
            <ListRow
              divider
              icon="phone-portrait-outline"
              tint={tokens.borrowed}
              title="মোবাইল ব্যাংকিং"
              subtitle="বিকাশ, নগদ, রকেট"
              trailing={<AmountText paisa={current.mfs} color={tokens.ink} />}
            />
          </ListGroup>
          <Text style={{ fontSize: textSize.sm, color: tokens.muted, textAlign: 'center' }}>
            সর্বশেষ গোনা হয়েছে · {relativeTimeBn(current.countedAt)}
          </Text>
          <Button label="ব্যালেন্স আপডেট করুন" icon="create-outline" onPress={() => setEditing(true)} />
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
