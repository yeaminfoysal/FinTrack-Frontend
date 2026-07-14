import { useState } from 'react';
import { Text, View } from 'react-native';

import { AmountText } from '@/components/ui/amount-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { withAlpha } from '@/constants/tokens';
import { useDashboard } from '@/hooks/use-dashboard';
import { fullDateBn } from '@/lib/date';
import { formatTaka, toPaisa, toTaka } from '@/lib/money';
import { useTheme } from '@/providers/theme-provider';
import { useDataStore } from '@/stores/data';

export default function BalanceScreen() {
  const { tokens } = useTheme();
  const monthKey = useDataStore((s) => s.monthKey);
  const practicals = useDataStore((s) => s.practicals);
  const setPractical = useDataStore((s) => s.setPractical);
  const { snapshot } = useDashboard();

  const current = practicals[monthKey];
  const [editing, setEditing] = useState(false);
  const [cash, setCash] = useState(current ? String(toTaka(current.cash)) : '');
  const [bank, setBank] = useState(current ? String(toTaka(current.bank)) : '');
  const [mfs, setMfs] = useState(current ? String(toTaka(current.mfs)) : '');

  const startEdit = () => {
    setCash(current ? String(toTaka(current.cash)) : '');
    setBank(current ? String(toTaka(current.bank)) : '');
    setMfs(current ? String(toTaka(current.mfs)) : '');
    setEditing(true);
  };

  const save = () => {
    setPractical(monthKey, { cash: toPaisa(cash || '0'), bank: toPaisa(bank || '0'), mfs: toPaisa(mfs || '0') });
    setEditing(false);
  };

  const untrackedIsIncome = snapshot.untracked < 0;

  return (
    <Screen>
      <View style={{ marginTop: 8, marginBottom: 18 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: tokens.ink }}>প্র্যাকটিক্যাল ব্যালেন্স</Text>
        <Text style={{ fontSize: 12, color: tokens.muted }}>এখন বাস্তবে হাতে যত টাকা আছে</Text>
      </View>

      {/* Total */}
      <Card radius={22} padding={20} style={{ alignItems: 'center', marginBottom: 18 }}>
        <Text style={{ fontSize: 12, color: tokens.muted }}>মোট প্র্যাকটিক্যাল ব্যালেন্স</Text>
        <AmountText paisa={current?.amount ?? 0} size={34} weight="700" color={tokens.ink} style={{ marginTop: 4 }} />
        <Text style={{ fontSize: 11.5, color: tokens.muted, marginTop: 4 }}>
          {current ? `সর্বশেষ আপডেট · ${fullDateBn(current.updatedAt)}` : 'এখনো ইনপুট দেওয়া হয়নি'}
        </Text>
      </Card>

      {editing ? (
        <View style={{ gap: 12 }}>
          <Field label="নগদ (Cash)" value={cash} onChangeText={setCash} keyboardType="numeric" prefix="৳" placeholder="0" />
          <Field label="ব্যাংক একাউন্ট" value={bank} onChangeText={setBank} keyboardType="numeric" prefix="৳" placeholder="0" />
          <Field label="মোবাইল ব্যাংকিং" value={mfs} onChangeText={setMfs} keyboardType="numeric" prefix="৳" placeholder="0" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button label="বাতিল" variant="outline" onPress={() => setEditing(false)} style={{ flex: 1 }} />
            <Button label="সেভ করুন" onPress={save} style={{ flex: 1 }} />
          </View>
        </View>
      ) : (
        <>
          <Text style={{ fontSize: 12.5, fontWeight: '600', color: tokens.muted, marginHorizontal: 4, marginBottom: 10 }}>
            উৎস অনুযায়ী ভাগ
          </Text>
          <View style={{ gap: 11 }}>
            <SourceRow icon="৳" color={tokens.primary} title="নগদ (Cash)" sub="হাতে আছে" amount={current?.cash ?? 0} />
            <SourceRow icon="🏦" color={tokens.lent} title="ব্যাংক একাউন্ট" sub="Savings / Current" amount={current?.bank ?? 0} />
            <SourceRow icon="📱" color={tokens.expense} title="মোবাইল ব্যাংকিং" sub="bKash + Nagad" amount={current?.mfs ?? 0} />
          </View>

          {/* Reconciliation */}
          <Card soft radius={18} padding={16} style={{ marginTop: 18 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: tokens.ink, marginBottom: 12 }}>রিকনসিলিয়েশন</Text>
            <ReconRow label="থিওরেটিক্যাল ব্যালেন্স" value={formatTaka(snapshot.theoretical)} tokens={tokens} />
            <ReconRow
              label="− প্র্যাকটিক্যাল ব্যালেন্স"
              value={current ? formatTaka(current.amount) : '—'}
              tokens={tokens}
            />
            <View style={{ height: 1, backgroundColor: tokens.line, marginVertical: 7 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: tokens.ink }}>
                = {untrackedIsIncome ? 'আনট্র্যাকড আয়' : 'আনট্র্যাকড খরচ'}
              </Text>
              <AmountText
                paisa={Math.abs(snapshot.untracked)}
                size={17}
                weight="700"
                color={untrackedIsIncome ? tokens.income : tokens.borrowed}
              />
            </View>
            <Text style={{ fontSize: 11, color: tokens.muted, marginTop: 8, lineHeight: 16 }}>
              হিসাবের বাইরে যাওয়া টাকা। প্র্যাকটিক্যাল বেশি হলে এটি “আনট্র্যাকড আয়” হিসেবে দেখাবে।
            </Text>
          </Card>

          <Button label="ব্যালেন্স আপডেট করুন" onPress={startEdit} style={{ marginTop: 18 }} />
        </>
      )}
    </Screen>
  );
}

function SourceRow({ icon, color, title, sub, amount }: { icon: string; color: string; title: string; sub: string; amount: number }) {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 13,
        backgroundColor: tokens.surface,
        borderColor: tokens.line,
        borderWidth: 1,
        borderRadius: 15,
        paddingVertical: 13,
        paddingHorizontal: 15,
      }}>
      <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: withAlpha(color, 0.12), alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color, fontSize: 17 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13.5, fontWeight: '600', color: tokens.ink }}>{title}</Text>
        <Text style={{ fontSize: 11, color: tokens.muted }}>{sub}</Text>
      </View>
      <AmountText paisa={amount} size={15} color={tokens.ink} />
    </View>
  );
}

function ReconRow({ label, value, tokens }: { label: string; value: string; tokens: ReturnType<typeof useTheme>['tokens'] }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
      <Text style={{ fontSize: 12.5, color: tokens.muted }}>{label}</Text>
      <Text style={{ fontSize: 12.5, fontWeight: '600', color: tokens.ink, fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );
}
