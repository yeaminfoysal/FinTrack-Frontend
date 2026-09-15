import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AmountText } from '@/components/ui/amount-text';
import { initialOf } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Pressable } from '@/components/ui/pressable';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { withAlpha } from '@/constants/tokens';
import { dayMonthBn, fullDateBn } from '@/lib/date';
import { localDigits } from '@/lib/digits';
import { formatTaka } from '@/lib/money';
import type { Loan, LoanDirection } from '@/lib/types';
import { useTheme } from '@/providers/theme-provider';
import { useDataStore } from '@/stores/data';
import { confirmDialog, showToast } from '@/stores/ui';

type SortKey = 'date' | 'amount';

const DIRECTION_OPTIONS: { value: LoanDirection; label: string }[] = [
  { value: 'LENT', label: 'ধার দেওয়া' },
  { value: 'BORROWED', label: 'ধার নেওয়া' },
];

export default function LoansScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState<LoanDirection>('LENT');
  const [sort, setSort] = useState<SortKey>('date');

  const loans = useDataStore((s) => s.loans);
  const settleLoan = useDataStore((s) => s.settleLoan);
  const unsettleLoan = useDataStore((s) => s.unsettleLoan);

  const visible = loans.filter((l) => !l.isDeleted);
  const lent = visible.filter((l) => l.direction === 'LENT');
  const borrowed = visible.filter((l) => l.direction === 'BORROWED');
  const activeOf = (list: Loan[]) => list.filter((l) => l.status === 'ACTIVE');
  const totalOf = (list: Loan[]) => activeOf(list).reduce((sum, l) => sum + l.amount, 0);

  // Active loans first, then newest date or the largest amount.
  const list = [...(tab === 'LENT' ? lent : borrowed)].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'ACTIVE' ? -1 : 1;
    if (sort === 'amount' && a.amount !== b.amount) return b.amount - a.amount;
    return b.date.localeCompare(a.date);
  });

  const settle = async (loan: Loan) => {
    const isLent = loan.direction === 'LENT';
    const confirmed = await confirmDialog({
      title: isLent ? 'টাকা ফেরত পেয়েছেন?' : 'টাকা শোধ করেছেন?',
      message: `${loan.personName} — ${formatTaka(loan.amount)}। এটা ${isLent ? 'পাওনা' : 'দেনা'} থেকে বাদ যাবে।`,
      confirmLabel: isLent ? 'হ্যাঁ, পেয়েছি' : 'হ্যাঁ, শোধ করেছি',
    });
    if (!confirmed) return;
    settleLoan(loan.id);
    showToast({
      message: `${loan.personName} — ${isLent ? 'ফেরত পাওয়া' : 'শোধ করা'} হিসেবে রাখা হয়েছে`,
      actionLabel: 'ফিরিয়ে নিন',
      onAction: () => unsettleLoan(loan.id),
    });
  };

  const addLoan = () => router.push({ pathname: '/add', params: { type: 'loan', direction: tab } });

  return (
    <Screen>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginTop: 8,
          marginBottom: 18,
        }}>
        <View style={{ flex: 1 }}>
          <Text accessibilityRole="header" style={{ fontSize: 21, fontWeight: '700', color: tokens.ink }}>
            লোন
          </Text>
          <Text style={{ fontSize: 13, color: tokens.muted }}>ধার দেওয়া ও ধার নেওয়া</Text>
        </View>
        <IconButton
          icon="swap-vertical"
          label={sort === 'date' ? 'টাকার পরিমাণ অনুযায়ী সাজান' : 'তারিখ অনুযায়ী সাজান'}
          onPress={() => setSort(sort === 'date' ? 'amount' : 'date')}
        />
      </View>

      {/* Totals */}
      <View style={{ flexDirection: 'row', gap: 11, marginBottom: 18 }}>
        <TotalCard label="মোট পাওনা" amount={totalOf(lent)} count={activeOf(lent).length} fill={tokens.lentFill} />
        <TotalCard label="মোট দেনা" amount={totalOf(borrowed)} count={activeOf(borrowed).length} fill={tokens.borrowedFill} />
      </View>

      <Segmented options={DIRECTION_OPTIONS} value={tab} onChange={setTab} accessibilityLabel="লোনের ধরন" />
      {list.length > 0 ? (
        <Text style={{ fontSize: 12.5, color: tokens.muted, marginTop: 10, marginHorizontal: 4 }}>
          চলমান আগে, তারপর {sort === 'date' ? 'নতুন তারিখ আগে' : 'বেশি টাকা আগে'}
        </Text>
      ) : null}

      <View style={{ gap: 11, marginTop: 12 }}>
        {list.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title={tab === 'LENT' ? 'কোনো পাওনা নেই' : 'কোনো দেনা নেই'}
            message={
              tab === 'LENT'
                ? 'কাউকে ধার দিলে এখানে লিখে রাখুন — কে কত ফেরত দেবে মনে থাকবে।'
                : 'কারো থেকে ধার নিলে এখানে লিখে রাখুন — কাকে কত ফেরত দিতে হবে মনে থাকবে।'
            }
            actionLabel="নতুন লোন যোগ করুন"
            onAction={addLoan}
          />
        ) : (
          list.map((loan) => (
            <LoanCard
              key={loan.id}
              loan={loan}
              onSettle={() => void settle(loan)}
              onOpen={() => router.push({ pathname: '/add-loan', params: { id: loan.id } })}
            />
          ))
        )}
      </View>

      {tab === 'BORROWED' ? (
        <View
          style={{
            marginTop: 14,
            flexDirection: 'row',
            gap: 10,
            backgroundColor: tokens.surface2,
            borderColor: tokens.line,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderRadius: 14,
            padding: 14,
          }}>
          <Icon name="information-circle-outline" size={18} color={tokens.muted} />
          <Text style={{ flex: 1, fontSize: 13, color: tokens.muted, lineHeight: 20 }}>
            ধার নেওয়া টাকা <Text style={{ color: tokens.ink, fontWeight: '700' }}>আয় নয়</Text> — এটি ফেরতযোগ্য দায়। শোধ করলে
            সেটি খরচও নয়, শুধু দায় নিষ্পত্তি।
          </Text>
        </View>
      ) : null}

      {list.length > 0 ? <Button label="নতুন লোন যোগ করুন" icon="add" onPress={addLoan} style={{ marginTop: 18 }} /> : null}
    </Screen>
  );
}

function TotalCard({ label, amount, count, fill }: { label: string; amount: number; count: number; fill: string }) {
  const { tokens } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${label} ${formatTaka(amount)}, ${localDigits(count)}টি চলমান`}
      style={{ flex: 1, borderRadius: 18, padding: 15, backgroundColor: fill, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%', backgroundColor: 'rgba(0,0,0,0.12)' }} />
      <Text style={{ fontSize: 13, color: tokens.onFill }}>{label}</Text>
      <AmountText paisa={amount} size={23} weight="700" color={tokens.onFill} numberOfLines={1} style={{ marginTop: 5 }} />
      <Text style={{ fontSize: 12.5, color: tokens.onFill, marginTop: 3 }}>{localDigits(count)}টি চলমান</Text>
    </View>
  );
}

function LoanCard({ loan, onSettle, onOpen }: { loan: Loan; onSettle: () => void; onOpen: () => void }) {
  const { tokens } = useTheme();
  const isLent = loan.direction === 'LENT';
  const color = isLent ? tokens.lent : tokens.borrowed;
  const settled = loan.status === 'SETTLED';
  const statusLabel = settled ? (isLent ? 'ফেরত পাওয়া' : 'শোধ করা') : 'চলমান';

  return (
    <View
      style={{
        backgroundColor: tokens.surface,
        borderColor: tokens.line,
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        gap: 12,
      }}>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`${loan.personName}, ${formatTaka(loan.amount)}, ${statusLabel}`}
        accessibilityHint="এডিট করতে ট্যাপ করুন"
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.7 : 1 })}>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: settled ? tokens.surface2 : withAlpha(color, 0.12),
          }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: settled ? tokens.muted : color }}>
            {initialOf(loan.personName)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontSize: 14.5, fontWeight: '600', color: settled ? tokens.muted : tokens.ink }}>
            {loan.personName}
          </Text>
          <Text numberOfLines={2} style={{ fontSize: 12.5, color: tokens.muted }}>
            {dayMonthBn(loan.date)}
            {loan.note ? ` · ${loan.note}` : ''}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <AmountText
            paisa={loan.amount}
            size={16}
            weight="700"
            color={settled ? tokens.muted : color}
            style={settled ? { textDecorationLine: 'line-through' } : undefined}
          />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingVertical: 2,
              paddingHorizontal: 8,
              borderRadius: 999,
              backgroundColor: tokens.surface2,
            }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: settled ? tokens.muted : isLent ? tokens.income : tokens.borrowed,
              }}
            />
            <Text style={{ fontSize: 12, fontWeight: '600', color: tokens.ink }}>{statusLabel}</Text>
          </View>
        </View>
      </Pressable>
      {settled ? (
        loan.settledDate ? (
          <Text style={{ fontSize: 12.5, color: tokens.muted }}>
            {isLent ? 'ফেরত পাওয়া গেছে' : 'শোধ করা হয়েছে'} · {fullDateBn(loan.settledDate)}
          </Text>
        ) : null
      ) : (
        <Button
          label={isLent ? 'ফেরত পেয়েছি' : 'শোধ করেছি'}
          icon="checkmark"
          variant="outline"
          color={color}
          size="sm"
          onPress={onSettle}
        />
      )}
    </View>
  );
}
