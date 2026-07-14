import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { AmountText } from '@/components/ui/amount-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { darken, withAlpha } from '@/constants/tokens';
import { dayMonthBn, fullDateBn, toBnDigits } from '@/lib/date';
import type { Loan, LoanDirection } from '@/lib/types';
import { useTheme } from '@/providers/theme-provider';
import { useDataStore } from '@/stores/data';

export default function LoansScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState<LoanDirection>('LENT');

  const loans = useDataStore((s) => s.loans);
  const settleLoan = useDataStore((s) => s.settleLoan);

  const active = loans.filter((l) => !l.isDeleted);
  const lent = active.filter((l) => l.direction === 'LENT');
  const borrowed = active.filter((l) => l.direction === 'BORROWED');

  const sum = (arr: Loan[]) => arr.filter((l) => l.status === 'ACTIVE').reduce((s, l) => s + l.amount, 0);
  const totalLent = sum(lent);
  const totalBorrowed = sum(borrowed);
  const lentActiveCount = lent.filter((l) => l.status === 'ACTIVE').length;
  const borrowedActiveCount = borrowed.filter((l) => l.status === 'ACTIVE').length;

  const list = (tab === 'LENT' ? lent : borrowed).sort((a, b) => {
    if (a.status !== b.status) return a.status === 'ACTIVE' ? -1 : 1;
    return a.date < b.date ? 1 : -1;
  });

  const confirmSettle = (loan: Loan) => {
    const verb = loan.direction === 'LENT' ? 'ফেরত পেয়েছেন' : 'ফেরত দিয়েছেন';
    Alert.alert('নিশ্চিত করুন', `${loan.personName} — টাকা কি ${verb}?`, [
      { text: 'বাতিল', style: 'cancel' },
      { text: 'হ্যাঁ', onPress: () => settleLoan(loan.id) },
    ]);
  };

  return (
    <Screen>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 8,
          marginBottom: 18,
        }}>
        <View>
          <Text style={{ fontSize: 20, fontWeight: '700', color: tokens.ink }}>লোন</Text>
          <Text style={{ fontSize: 12, color: tokens.muted }}>ধার দেওয়া ও ধার নেওয়া</Text>
        </View>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: tokens.surface2,
            borderColor: tokens.line,
            borderWidth: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text style={{ color: tokens.muted, fontSize: 17 }}>⇅</Text>
        </View>
      </View>

      {/* Totals */}
      <View style={{ flexDirection: 'row', gap: 11, marginBottom: 18 }}>
        <TotalCard
          label="মোট পাওনা"
          amount={totalLent}
          meta={`${toBnDigits(lentActiveCount)} জন · Active`}
          color={tokens.lent}
        />
        <TotalCard
          label="মোট দেনা"
          amount={totalBorrowed}
          meta={`${toBnDigits(borrowedActiveCount)} জন · Active`}
          color={tokens.borrowed}
        />
      </View>

      <Segmented
        options={[
          { value: 'LENT', label: 'ধার দেওয়া' },
          { value: 'BORROWED', label: 'ধার নেওয়া' },
        ]}
        value={tab}
        onChange={(v) => setTab(v)}
      />

      <View style={{ gap: 11, marginTop: 16 }}>
        {list.length === 0 ? (
          <Text style={{ color: tokens.muted, fontSize: 13, paddingHorizontal: 4, paddingVertical: 20, textAlign: 'center' }}>
            কোনো {tab === 'LENT' ? 'পাওনা' : 'দেনা'} নেই।
          </Text>
        ) : (
          list.map((loan) => <LoanCard key={loan.id} loan={loan} onSettle={() => confirmSettle(loan)} />)
        )}
      </View>

      {tab === 'BORROWED' ? (
        <View
          style={{
            marginTop: 14,
            backgroundColor: tokens.surface2,
            borderColor: tokens.line,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderRadius: 14,
            padding: 14,
          }}>
          <Text style={{ fontSize: 11.5, color: tokens.muted, lineHeight: 18 }}>
            ℹ️ ধার নেওয়া টাকা <Text style={{ color: tokens.ink, fontWeight: '700' }}>আয় নয়</Text> — এটি ফেরতযোগ্য দায়। ফেরত দিলে সেটি খরচও নয়, শুধু দায় নিষ্পত্তি।
          </Text>
        </View>
      ) : null}

      <Button
        label="নতুন লোন যোগ করুন"
        leftGlyph="+"
        onPress={() => router.push('/add-loan')}
        style={{ marginTop: 18 }}
      />
    </Screen>
  );
}

function TotalCard({ label, amount, meta, color }: { label: string; amount: number; meta: string; color: string }) {
  return (
    <View style={{ flex: 1, borderRadius: 18, padding: 15, backgroundColor: color, overflow: 'hidden' }}>
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '55%',
          backgroundColor: darken(color, 0.22),
          opacity: 0.5,
        }}
      />
      <Text style={{ fontSize: 12, color: '#fff', opacity: 0.85 }}>{label}</Text>
      <AmountText paisa={amount} size={23} weight="700" color="#fff" style={{ marginTop: 5 }} />
      <Text style={{ fontSize: 11, color: '#fff', opacity: 0.8, marginTop: 3 }}>{meta}</Text>
    </View>
  );
}

function LoanCard({ loan, onSettle }: { loan: Loan; onSettle: () => void }) {
  const { tokens } = useTheme();
  const color = loan.direction === 'LENT' ? tokens.lent : tokens.borrowed;
  const settled = loan.status === 'SETTLED';

  return (
    <View
      style={{
        backgroundColor: tokens.surface,
        borderColor: tokens.line,
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        opacity: settled ? 0.62 : 1,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            backgroundColor: settled ? tokens.surface2 : withAlpha(color, 0.12),
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text style={{ color: settled ? tokens.muted : color, fontWeight: '700' }}>
            {loan.personName.slice(0, 1)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: tokens.ink }}>{loan.personName}</Text>
          <Text style={{ fontSize: 11.5, color: tokens.muted }}>
            {dayMonthBn(loan.date)}
            {loan.note ? ` · "${loan.note}"` : ''}
            {settled && loan.settledDate ? ` · ফেরত ${dayMonthBn(loan.settledDate)}` : ''}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <AmountText
            paisa={loan.amount}
            size={16}
            weight="700"
            color={settled ? tokens.muted : color}
            style={settled ? { textDecorationLine: 'line-through' } : undefined}
          />
          <Text
            style={{
              fontSize: 10,
              fontWeight: '600',
              marginTop: 3,
              overflow: 'hidden',
              color: settled ? tokens.muted : loan.direction === 'LENT' ? tokens.income : tokens.borrowed,
              backgroundColor: settled ? tokens.surface2 : withAlpha(loan.direction === 'LENT' ? tokens.income : tokens.borrowed, 0.12),
              paddingVertical: 2,
              paddingHorizontal: 7,
              borderRadius: 6,
            }}>
            {settled ? (loan.direction === 'LENT' ? 'Returned' : 'Paid') : 'Active'}
          </Text>
        </View>
      </View>
      {!settled ? (
        <Button
          label={loan.direction === 'LENT' ? 'ফেরত পেয়েছি (Returned)' : 'ফেরত দিয়েছি (Paid)'}
          variant="outline"
          color={color}
          onPress={onSettle}
          style={{ marginTop: 12, paddingVertical: 9 }}
        />
      ) : null}
      {settled && loan.settledDate ? (
        <Text style={{ fontSize: 10.5, color: tokens.muted, marginTop: 8 }}>
          নিষ্পত্তি হয়েছে · {fullDateBn(loan.settledDate)}
        </Text>
      ) : null}
    </View>
  );
}
