import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { LoanPaymentSheet } from '@/components/loan-payment-sheet';
import { PageTitle } from '@/components/page-title';
import { AmountText } from '@/components/ui/amount-text';
import { initialOf } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Screen, screenListContentStyle } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { withAlpha } from '@/constants/tokens';
import { textSize } from '@/constants/typography';
import { loanOutstanding, loanSettled, outstandingLoans, paidOnLoan } from '@/lib/calc';
import { dayMonth, fullDate } from '@/lib/date';
import { localDigits } from '@/lib/digits';
import { useStrings } from '@/lib/i18n';
import { dueLabel, loanDue } from '@/lib/loan-due';
import { formatTaka } from '@/lib/money';
import type { Loan, LoanDirection, LoanPayment } from '@/lib/types';
import { useTheme } from '@/providers/theme-provider';
import { useDataStore } from '@/stores/data';

type SortKey = 'date' | 'amount';

export default function LoansScreen() {
  const { tokens } = useTheme();
  const strings = useStrings();
  const t = strings.loansScreen;
  const directionOptions = useMemo<{ value: LoanDirection; label: string }[]>(
    () => [
      { value: 'LENT', label: strings.activity.lent },
      { value: 'BORROWED', label: strings.activity.borrowed },
    ],
    [strings],
  );
  const router = useRouter();
  const [tab, setTab] = useState<LoanDirection>('LENT');
  const [sort, setSort] = useState<SortKey>('date');
  const [paying, setPaying] = useState<Loan | null>(null);

  const loans = useDataStore((s) => s.loans);
  const payments = useDataStore((s) => s.loanPayments);

  const visible = loans.filter((l) => !l.isDeleted);
  const lent = visible.filter((l) => l.direction === 'LENT');
  const borrowed = visible.filter((l) => l.direction === 'BORROWED');
  const runningCount = (list: Loan[]) => list.filter((l) => !loanSettled(l, payments)).length;

  // Still-running loans first, then newest date or the largest amount.
  const list = [...(tab === 'LENT' ? lent : borrowed)].sort((a, b) => {
    const aDone = loanSettled(a, payments);
    const bDone = loanSettled(b, payments);
    if (aDone !== bDone) return aDone ? 1 : -1;
    if (sort === 'amount' && a.amount !== b.amount) return b.amount - a.amount;
    return b.date.localeCompare(a.date);
  });

  const addLoan = () => router.push({ pathname: '/add', params: { type: 'loan', direction: tab } });

  const header = (
    <View style={{ marginBottom: 12 }}>
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
          <Text accessibilityRole="header" style={{ fontSize: textSize.xl, fontWeight: '700', color: tokens.ink }}>
            {strings.tabs.loans}
          </Text>
          <Text style={{ fontSize: textSize.sm, color: tokens.muted }}>{t.subtitle}</Text>
        </View>
        <IconButton
          icon="swap-vertical"
          label={sort === 'date' ? t.sortByAmount : t.sortByDate}
          onPress={() => setSort(sort === 'date' ? 'amount' : 'date')}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: 11, marginBottom: 18 }}>
        <TotalCard
          label={t.totalLent}
          amount={outstandingLoans(visible, 'LENT', payments)}
          count={runningCount(lent)}
          fill={tokens.lentFill}
        />
        <TotalCard
          label={t.totalBorrowed}
          amount={outstandingLoans(visible, 'BORROWED', payments)}
          count={runningCount(borrowed)}
          fill={tokens.borrowedFill}
        />
      </View>

      <Segmented options={directionOptions} value={tab} onChange={setTab} accessibilityLabel={strings.loanForm.kindA11y} />
      {list.length > 0 ? (
        <Text style={{ fontSize: textSize.sm, color: tokens.muted, marginTop: 10, marginHorizontal: 4 }}>
          {t.sortNote(sort === 'date' ? t.newestFirst : t.largestFirst)}
        </Text>
      ) : null}
    </View>
  );

  const footer = (
    <>
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
          <Text style={{ flex: 1, fontSize: textSize.sm, color: tokens.muted, lineHeight: 20 }}>
            {t.borrowedPrefix}
            <Text style={{ color: tokens.ink, fontWeight: '700' }}>{t.borrowedEmphasis}</Text>
            {t.borrowedSuffix}
          </Text>
        </View>
      ) : null}
      {list.length > 0 ? <Button label={t.addLoan} icon="add" onPress={addLoan} style={{ marginTop: 18 }} /> : null}
    </>
  );

  return (
    <Screen scroll={false} padded={false}>
      <PageTitle title={strings.tabs.loans} />
      <FlatList
        data={list}
        keyExtractor={(loan) => loan.id}
        renderItem={({ item }) => (
          <LoanCard
            loan={item}
            payments={payments}
            onPay={() => setPaying(item)}
            onOpen={() => router.push({ pathname: '/add-loan', params: { id: item.id } })}
          />
        )}
        ItemSeparatorComponent={LoanGap}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title={tab === 'LENT' ? t.emptyLentTitle : t.emptyBorrowedTitle}
            message={tab === 'LENT' ? t.emptyLentMessage : t.emptyBorrowedMessage}
            actionLabel={t.addLoan}
            onAction={addLoan}
          />
        }
        ListFooterComponent={footer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={screenListContentStyle}
      />
      <LoanPaymentSheet loan={paying} onClose={() => setPaying(null)} />
    </Screen>
  );
}

function LoanGap() {
  return <View style={{ height: 11 }} />;
}

function TotalCard({ label, amount, count, fill }: { label: string; amount: number; count: number; fill: string }) {
  const { tokens } = useTheme();
  const t = useStrings().loansScreen;
  return (
    <View
      accessible
      accessibilityLabel={t.summaryA11y(label, formatTaka(amount), localDigits(count))}
      style={{ flex: 1, borderRadius: 18, padding: 15, backgroundColor: fill, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%', backgroundColor: 'rgba(0,0,0,0.12)' }} />
      <Text style={{ fontSize: textSize.sm, color: tokens.onFill }}>{label}</Text>
      <AmountText paisa={amount} size="xl" weight="700" color={tokens.onFill} numberOfLines={1} style={{ marginTop: 5 }} />
      <Text style={{ fontSize: textSize.sm, color: tokens.onFill, marginTop: 3 }}>{t.activeCount(localDigits(count))}</Text>
    </View>
  );
}

function LoanCard({
  loan,
  payments,
  onPay,
  onOpen,
}: {
  loan: Loan;
  payments: LoanPayment[];
  onPay: () => void;
  onOpen: () => void;
}) {
  const { tokens } = useTheme();
  const strings = useStrings();
  const t = strings.loansScreen;
  const isLent = loan.direction === 'LENT';
  const color = isLent ? tokens.lent : tokens.borrowed;
  const paid = paidOnLoan(loan, payments);
  const remaining = loanOutstanding(loan, payments);
  const settled = remaining <= 0;
  const partly = !settled && paid > 0;
  const statusLabel = settled
    ? isLent
      ? strings.activity.returned
      : strings.activity.repaid
    : partly
      ? strings.activity.partly
      : strings.activity.ongoing;
  const due = loanDue(loan, settled);
  const settledOn = loan.settledDate ?? (settled ? payments.filter((p) => p.loanId === loan.id && !p.isDeleted).at(-1)?.date : null);

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
        accessibilityHint={strings.activity.editHint}
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
          <Text style={{ fontSize: textSize.lg, fontWeight: '700', color: settled ? tokens.muted : color }}>
            {initialOf(loan.personName)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontSize: textSize.md, fontWeight: '600', color: settled ? tokens.muted : tokens.ink }}>
            {loan.personName}
          </Text>
          <Text numberOfLines={2} style={{ fontSize: textSize.sm, color: tokens.muted }}>
            {dayMonth(loan.date)}
            {loan.note ? ` · ${loan.note}` : ''}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <AmountText
            paisa={loan.amount}
            size="lg"
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
            <Text style={{ fontSize: textSize.xs, fontWeight: '600', color: tokens.ink }}>{statusLabel}</Text>
          </View>
        </View>
      </Pressable>

      {/* Part of it back: the bar carries what is left, which is the figure that matters. */}
      {partly ? (
        <View style={{ gap: 6 }}>
          <View
            accessible
            accessibilityLabel={t.progressA11y(
              formatTaka(paid),
              isLent ? strings.loanForm.settledLent : strings.loanForm.settledBorrowed,
              formatTaka(remaining),
            )}
            style={{ height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: tokens.chip }}>
            <View style={{ width: `${Math.round((paid / loan.amount) * 100)}%`, height: '100%', backgroundColor: color }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
            <Text style={{ fontSize: textSize.sm, color: tokens.muted }}>
              {strings.loanPayment.paidLine(isLent ? strings.loanPayment.lentVerb : strings.loanPayment.borrowedVerb, formatTaka(paid))}
            </Text>
            <Text style={{ fontSize: textSize.sm, color: tokens.muted }}>
              {strings.loanPayment.remainingPrefix}
              <Text style={{ fontWeight: '700', color }}>{formatTaka(remaining)}</Text>
            </Text>
          </View>
        </View>
      ) : null}

      {due ? <DueBadge label={dueLabel(due)} overdue={due.overdue} soon={due.soon} /> : null}

      {settled ? (
        settledOn ? (
          <Text style={{ fontSize: textSize.sm, color: tokens.muted }}>
            {strings.loanForm.settledOn(
              isLent ? strings.loanForm.settledLent : strings.loanForm.settledBorrowed,
              fullDate(settledOn),
            )}
          </Text>
        ) : null
      ) : (
        <Button
          label={isLent ? strings.loanForm.recordLent : strings.loanForm.recordBorrowed}
          icon="checkmark"
          variant="outline"
          color={color}
          size="sm"
          accessibilityHint={t.recordHint}
          onPress={onPay}
        />
      )}
    </View>
  );
}

function DueBadge({ label, overdue, soon }: { label: string; overdue: boolean; soon: boolean }) {
  const { tokens } = useTheme();
  const color = overdue ? tokens.expense : soon ? tokens.borrowed : tokens.muted;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Icon name={overdue ? 'alert-circle-outline' : 'time-outline'} size={15} color={color} />
      <Text style={{ fontSize: textSize.sm, fontWeight: overdue ? '700' : '500', color }}>{label}</Text>
    </View>
  );
}
