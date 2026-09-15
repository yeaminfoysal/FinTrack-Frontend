import { useState } from 'react';
import { View } from 'react-native';

import { AmountText } from '@/components/ui/amount-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Icon, type IconName } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { withAlpha } from '@/constants/tokens';
import { useDashboard } from '@/hooks/use-dashboard';
import { relativeTimeBn } from '@/lib/date';
import { amountInputFromPaisa, formatTaka, sanitizeAmountInput, toPaisa } from '@/lib/money';
import { useTheme } from '@/providers/theme-provider';
import { useDataStore } from '@/stores/data';
import { showToast } from '@/stores/ui';

export default function BalanceScreen() {
  const { tokens } = useTheme();
  const monthKey = useDataStore((s) => s.monthKey);
  const practicals = useDataStore((s) => s.practicals);
  const setPractical = useDataStore((s) => s.setPractical);
  const { snapshot } = useDashboard();

  const current = practicals[monthKey];
  const [editing, setEditing] = useState(false);
  const [cash, setCash] = useState('');
  const [bank, setBank] = useState('');
  const [mfs, setMfs] = useState('');

  const startEdit = () => {
    setCash(current ? amountInputFromPaisa(current.cash) : '');
    setBank(current ? amountInputFromPaisa(current.bank) : '');
    setMfs(current ? amountInputFromPaisa(current.mfs) : '');
    setEditing(true);
  };

  const save = () => {
    setPractical(monthKey, { cash: toPaisa(cash || '0'), bank: toPaisa(bank || '0'), mfs: toPaisa(mfs || '0') });
    setEditing(false);
    showToast({ message: 'ব্যালেন্স আপডেট হয়েছে' });
  };

  const untrackedIsIncome = snapshot.untracked < 0;
  const draftTotal = toPaisa(cash || '0') + toPaisa(bank || '0') + toPaisa(mfs || '0');

  return (
    <Screen>
      <View style={{ marginTop: 8, marginBottom: 18 }}>
        <Text accessibilityRole="header" style={{ fontSize: 21, fontWeight: '700', color: tokens.ink }}>
          প্র্যাকটিক্যাল ব্যালেন্স
        </Text>
        <Text style={{ fontSize: 13, color: tokens.muted }}>এখন বাস্তবে হাতে, ব্যাংকে ও মোবাইল ব্যাংকিংয়ে যত টাকা আছে</Text>
      </View>

      {/* Total */}
      <Card radius={22} padding={20} style={{ alignItems: 'center', marginBottom: 18 }}>
        <Text style={{ fontSize: 13, color: tokens.muted }}>মোট প্র্যাকটিক্যাল ব্যালেন্স</Text>
        {current ? (
          <AmountText paisa={current.amount} size={34} weight="700" color={tokens.ink} style={{ marginTop: 4 }} />
        ) : (
          <Text style={{ fontSize: 34, fontWeight: '700', color: tokens.muted, marginTop: 4 }}>—</Text>
        )}
        <Text style={{ fontSize: 12.5, color: tokens.muted, marginTop: 4 }}>
          {current ? `সর্বশেষ আপডেট · ${relativeTimeBn(current.updatedAt)}` : 'এই মাসে এখনো দেওয়া হয়নি'}
        </Text>
      </Card>

      {editing ? (
        <View style={{ gap: 12 }}>
          <Field
            label="নগদ"
            value={cash}
            onChangeText={(v) => setCash(sanitizeAmountInput(v))}
            keyboardType="decimal-pad"
            prefix="৳"
            placeholder="0"
            autoFocus
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
          <Text style={{ fontSize: 14, color: tokens.muted, marginLeft: 2 }}>
            মোট: <Text style={{ fontWeight: '700', color: tokens.ink }}>{formatTaka(draftTotal)}</Text>
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button label="বাতিল" variant="secondary" onPress={() => setEditing(false)} style={{ flex: 1 }} />
            <Button label="সেভ করুন" icon="checkmark" onPress={save} style={{ flex: 1 }} />
          </View>
        </View>
      ) : (
        <>
          <Text style={{ fontSize: 13, fontWeight: '600', color: tokens.muted, marginHorizontal: 4, marginBottom: 10 }}>
            উৎস অনুযায়ী ভাগ
          </Text>
          <View style={{ gap: 11 }}>
            <SourceRow icon="cash-outline" color={tokens.primary} title="নগদ" sub="হাতে আছে" amount={current?.cash ?? null} />
            <SourceRow
              icon="business-outline"
              color={tokens.lent}
              title="ব্যাংক অ্যাকাউন্ট"
              sub="সেভিংস / কারেন্ট অ্যাকাউন্ট"
              amount={current?.bank ?? null}
            />
            <SourceRow
              icon="phone-portrait-outline"
              color={tokens.borrowed}
              title="মোবাইল ব্যাংকিং"
              sub="বিকাশ, নগদ, রকেট"
              amount={current?.mfs ?? null}
            />
          </View>

          {/* Reconciliation */}
          <Card soft radius={18} padding={16} style={{ marginTop: 18 }}>
            <Text accessibilityRole="header" style={{ fontSize: 14, fontWeight: '700', color: tokens.ink, marginBottom: 10 }}>
              হিসাব মেলানো
            </Text>
            <ReconRow label="হিসাব অনুযায়ী থাকার কথা" value={formatTaka(snapshot.theoretical)} />
            <ReconRow label="− বাস্তবে আছে" value={current ? formatTaka(current.amount) : '—'} />
            <View style={{ height: 1, backgroundColor: tokens.line, marginVertical: 7 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: tokens.ink }}>
                = {untrackedIsIncome ? 'আনট্র্যাকড আয়' : 'আনট্র্যাকড খরচ'}
              </Text>
              <AmountText
                paisa={Math.abs(snapshot.untracked)}
                size={17}
                weight="700"
                color={untrackedIsIncome ? tokens.income : tokens.borrowed}
              />
            </View>
            <Text style={{ fontSize: 12.5, color: tokens.muted, marginTop: 8, lineHeight: 19 }}>
              {current
                ? 'যে টাকা খরচ হয়েছে কিন্তু লেখা হয়নি। বাস্তবে বেশি থাকলে এটা “আনট্র্যাকড আয়” দেখাবে।'
                : 'বাস্তবে কত আছে দিলে লেখা হয়নি এমন খরচ এখানে ধরা পড়বে।'}
            </Text>
          </Card>

          <Button
            label={current ? 'ব্যালেন্স আপডেট করুন' : 'ব্যালেন্স লিখুন'}
            icon="create-outline"
            onPress={startEdit}
            style={{ marginTop: 18 }}
          />
        </>
      )}
    </Screen>
  );
}

function SourceRow({
  icon,
  color,
  title,
  sub,
  amount,
}: {
  icon: IconName;
  color: string;
  title: string;
  sub: string;
  amount: number | null;
}) {
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
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 11,
          backgroundColor: withAlpha(color, 0.12),
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: tokens.ink }}>{title}</Text>
        <Text style={{ fontSize: 12.5, color: tokens.muted }}>{sub}</Text>
      </View>
      {amount == null ? (
        <Text style={{ fontSize: 15, color: tokens.muted }}>—</Text>
      ) : (
        <AmountText paisa={amount} size={15} color={tokens.ink} />
      )}
    </View>
  );
}

function ReconRow({ label, value }: { label: string; value: string }) {
  const { tokens } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 5 }}>
      <Text style={{ fontSize: 13, color: tokens.muted }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '600', color: tokens.ink, fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );
}
