import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmountText } from '@/components/ui/amount-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Pressable } from '@/components/ui/pressable';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import { categoryMeta, incomeSourceMeta } from '@/constants/categories';
import { withAlpha } from '@/constants/tokens';
import { useDashboard } from '@/hooks/use-dashboard';
import { dailyExpenses, monthDailyExpense, monthIncome, type DayExpenses } from '@/lib/calc';
import {
  currentMonthKey,
  dayMonthBn,
  daysInMonth,
  isInMonth,
  monthKeyOf,
  monthLabelBn,
  monthName,
  nextMonthKey,
  parseMonthKey,
  prevMonthKey,
  shiftDayKey,
  todayKey,
  weekdayBn,
  type DayKey,
  type MonthKey,
} from '@/lib/date';
import { localDigits } from '@/lib/digits';
import { formatTaka } from '@/lib/money';
import { buildMonthReportHtml } from '@/lib/report-html';
import { saveReportPdf, shareReportPdf } from '@/lib/report-pdf';
import type { Expense, Income, MonthlySummary } from '@/lib/types';
import { useTheme } from '@/providers/theme-provider';
import { useDataStore } from '@/stores/data';
import { showToast } from '@/stores/ui';

/** Months that have any income, expense or closed summary, plus the current month — newest first. */
function monthsWithData(
  current: MonthKey,
  incomes: Income[],
  expenses: Expense[],
  summaries: MonthlySummary[],
): MonthKey[] {
  const keys = new Set<MonthKey>([current]);
  for (const r of [...incomes, ...expenses]) if (!r.isDeleted) keys.add(monthKeyOf(new Date(r.date)));
  for (const s of summaries) if (!s.isDeleted) keys.add(`${s.year}-${String(s.month).padStart(2, '0')}`);
  return [...keys].sort().reverse();
}

export default function ReportScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const thisMonth = currentMonthKey();
  const [monthKey, setMonthKey] = useState<MonthKey>(thisMonth);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [openDays, setOpenDays] = useState<Record<DayKey, boolean>>({});

  const { snapshot } = useDashboard(monthKey);
  const incomes = useDataStore((s) => s.incomes);
  const expenses = useDataStore((s) => s.expenses);
  const summaries = useDataStore((s) => s.summaries);
  const loans = useDataStore((s) => s.loans);
  const profile = useDataStore((s) => s.profile);
  const [exporting, setExporting] = useState<'share' | 'save' | null>(null);

  const months = useMemo(
    () => monthsWithData(thisMonth, incomes, expenses, summaries),
    [thisMonth, incomes, expenses, summaries],
  );
  const days = useMemo(() => dailyExpenses(expenses, monthKey), [expenses, monthKey]);
  const monthIncomes = useMemo(
    () =>
      incomes
        .filter((i) => !i.isDeleted && isInMonth(i.date, monthKey))
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [incomes, monthKey],
  );
  const editIncome = (id: string) => router.push({ pathname: '/add-income', params: { id } });
  const editExpense = (id: string) => router.push({ pathname: '/add-expense', params: { id } });

  const isCurrent = monthKey === thisMonth;
  const monthTitle = isCurrent ? 'এই মাসের' : `${monthName(parseMonthKey(monthKey).month)} মাসের`;
  const canPrev = monthKey > months[months.length - 1];
  const canNext = monthKey < months[0];

  const closing = snapshot.opening + snapshot.saving;
  const spent = snapshot.monthDailyExpense + Math.max(snapshot.untracked, 0);
  const savedPct = snapshot.monthIncome > 0 ? Math.max(0, Math.min(100, (snapshot.saving / snapshot.monthIncome) * 100)) : 0;
  const nextOpeningLabel = monthName(parseMonthKey(nextMonthKey(monthKey)).month);

  // Running month averages over the days elapsed so far; past months over the whole month.
  const elapsedDays = isCurrent ? new Date().getDate() : daysInMonth(monthKey);
  const dailyAverage = Math.round(snapshot.monthDailyExpense / elapsedDays);
  const today = todayKey();
  const yesterday = shiftDayKey(today, -1);

  // The newest day starts expanded; the rest stay collapsed until tapped.
  const isDayOpen = (day: DayKey, idx: number) => openDays[day] ?? idx === 0;
  const allOpen = days.length > 0 && days.every((d, idx) => isDayOpen(d.day, idx));
  const toggleAll = () => setOpenDays(Object.fromEntries(days.map((d) => [d.day, !allOpen])));

  const history = summaries.filter((s) => !s.isDeleted);

  const exportPdf = async (mode: 'share' | 'save') => {
    setExporting(mode);
    try {
      const html = buildMonthReportHtml({ monthKey, snapshot, incomes, expenses, loans, userName: profile.name });
      if (mode === 'share') {
        await shareReportPdf(html, monthKey);
      } else {
        const saved = await saveReportPdf(html, monthKey);
        if (saved.status === 'saved') showToast({ message: `PDF সেভ হয়েছে · "${saved.folder}" ফোল্ডারে` });
      }
    } catch (e) {
      console.warn('[report] PDF export failed:', e);
      showToast({
        tone: 'error',
        message: `PDF তৈরি করা যায়নি। ${e instanceof Error ? e.message : 'আবার চেষ্টা করুন।'}`,
      });
    } finally {
      setExporting(null);
    }
  };

  return (
    <Screen>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          marginTop: 8,
          marginBottom: 18,
        }}>
        <View style={{ flex: 1 }}>
          <Text accessibilityRole="header" style={{ fontSize: 21, fontWeight: '700', color: tokens.ink }}>
            মাসিক রিপোর্ট
          </Text>
          <Text style={{ fontSize: 13, color: tokens.muted }}>পুরো মাসের সারসংক্ষেপ</Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: tokens.surface,
            borderColor: tokens.line,
            borderWidth: 1,
            borderRadius: 999,
          }}>
          <IconButton
            icon="chevron-back"
            label="আগের মাস"
            variant="plain"
            size={36}
            iconSize={18}
            disabled={!canPrev}
            onPress={() => setMonthKey(prevMonthKey(monthKey))}
          />
          <Pressable
            onPress={() => setPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`${monthLabelBn(monthKey)} — মাস বাছাই করুন`}
            hitSlop={6}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: tokens.ink }}>{monthLabelBn(monthKey)}</Text>
            <Icon name="chevron-down" size={14} color={tokens.muted} />
          </Pressable>
          <IconButton
            icon="chevron-forward"
            label="পরের মাস"
            variant="plain"
            size={36}
            iconSize={18}
            disabled={!canNext}
            onPress={() => setMonthKey(nextMonthKey(monthKey))}
          />
        </View>
      </View>

      {/* Saving hero */}
      <View style={{ borderRadius: 20, padding: 18, backgroundColor: tokens.primaryFill, marginBottom: 16 }}>
        <Text style={{ fontSize: 13.5, color: tokens.onFill }}>{monthTitle} সঞ্চয়</Text>
        <AmountText paisa={snapshot.saving} size={30} weight="700" color={tokens.onFill} style={{ marginTop: 4, marginBottom: 14 }} />
        <View
          accessible
          accessibilityLabel={`আয়ের ${localDigits(Math.round(savedPct))}% সঞ্চয় হয়েছে`}
          style={{ flexDirection: 'row', height: 10, borderRadius: 6, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.22)' }}>
          <View style={{ width: `${savedPct}%`, backgroundColor: tokens.onFill }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <Text style={{ fontSize: 12.5, color: tokens.onFill }}>আয় {formatTaka(snapshot.monthIncome)}</Text>
          <Text style={{ fontSize: 12.5, color: tokens.onFill }}>খরচ {formatTaka(spent)}</Text>
        </View>
      </View>

      {/* Breakdown */}
      <View style={{ backgroundColor: tokens.surface, borderColor: tokens.line, borderWidth: 1, borderRadius: 18, overflow: 'hidden' }}>
        <BreakRow label="ওপেনিং ব্যালেন্স" value={formatTaka(snapshot.opening)} color={tokens.ink} />
        <Divider />
        <BreakRow label="মোট আয়" value={`+ ${formatTaka(snapshot.monthIncome)}`} color={tokens.income} />
        <Divider />
        <BreakRow label="দৈনিক খরচ" value={`− ${formatTaka(snapshot.monthDailyExpense)}`} color={tokens.expense} />
        <Divider />
        <BreakRow label="পাওনা (বাকি)" value={formatTaka(snapshot.outstandingLent)} color={tokens.lent} />
        <Divider />
        <BreakRow label="দেনা (বাকি)" value={formatTaka(snapshot.outstandingBorrowed)} color={tokens.borrowed} />
        <Divider />
        <BreakRow
          label={snapshot.untracked < 0 ? 'আনট্র্যাকড আয়' : 'আনট্র্যাকড খরচ'}
          value={formatTaka(Math.abs(snapshot.untracked))}
          color={snapshot.untracked < 0 ? tokens.income : tokens.borrowed}
        />
        <Divider />
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingVertical: 14,
            paddingHorizontal: 16,
            backgroundColor: tokens.surface2,
          }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: tokens.ink }}>ক্লোজিং ব্যালেন্স</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: tokens.ink, fontVariant: ['tabular-nums'] }}>
            {formatTaka(closing)}
          </Text>
        </View>
      </View>

      <Card
        soft
        radius={14}
        style={{ marginTop: 14, borderStyle: 'dashed', paddingVertical: 12, paddingHorizontal: 15, flexDirection: 'row', gap: 10 }}>
        <Icon name="repeat-outline" size={18} color={tokens.muted} />
        <Text style={{ flex: 1, fontSize: 12.5, color: tokens.muted, lineHeight: 19 }}>
          <Text style={{ color: tokens.ink, fontWeight: '700' }}>ক্যারি ফরোয়ার্ড:</Text> {nextOpeningLabel} মাসের ওপেনিং ={' '}
          {formatTaka(snapshot.opening)} + {formatTaka(snapshot.saving)} ={' '}
          <Text style={{ color: tokens.ink, fontWeight: '600' }}>{formatTaka(closing)}</Text>
        </Text>
      </Card>

      {/* Day-wise expenses */}
      <SectionHeader
        title="দিনভিত্তিক খরচ"
        actionLabel={days.length > 0 ? (allOpen ? 'সব বন্ধ করুন' : 'সব খুলুন') : undefined}
        onAction={toggleAll}
        actionChevron={false}
      />
      {days.length > 0 ? (
        <>
          <Text style={{ fontSize: 12.5, color: tokens.muted, marginTop: -4, marginBottom: 4, paddingHorizontal: 4 }}>
            {localDigits(days.length)} দিনে মোট{' '}
            <Text style={{ color: tokens.expense, fontWeight: '600' }}>{formatTaka(snapshot.monthDailyExpense)}</Text> · দৈনিক
            গড় <Text style={{ color: tokens.ink, fontWeight: '600' }}>{formatTaka(dailyAverage)}</Text>
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, paddingHorizontal: 4 }}>
            <Icon name="create-outline" size={14} color={tokens.muted} />
            <Text style={{ flex: 1, fontSize: 12.5, color: tokens.muted }}>যেকোনো খরচ বা আয়ে ট্যাপ করে এডিট বা ডিলিট করুন</Text>
          </View>
          <View style={{ gap: 9 }}>
            {days.map((d, idx) => (
              <DayCard
                key={d.day}
                group={d}
                relative={d.day === today ? 'আজ' : d.day === yesterday ? 'গতকাল' : weekdayBn(d.items[0].date)}
                open={isDayOpen(d.day, idx)}
                onToggle={() => setOpenDays((o) => ({ ...o, [d.day]: !isDayOpen(d.day, idx) }))}
                onEdit={editExpense}
              />
            ))}
          </View>
        </>
      ) : (
        <EmptyState
          icon="receipt-outline"
          title="এই মাসে কোনো খরচ নেই"
          message={isCurrent ? 'খরচ যোগ করলে দিন অনুযায়ী এখানে দেখাবে।' : undefined}
          actionLabel={isCurrent ? 'খরচ যোগ করুন' : undefined}
          onAction={isCurrent ? () => router.push('/add') : undefined}
        />
      )}

      {/* Incomes of the month */}
      <SectionHeader title="আয়ের তালিকা" />
      {monthIncomes.length === 0 ? (
        <EmptyState
          icon="wallet-outline"
          title="এই মাসে কোনো আয় নেই"
          actionLabel={isCurrent ? 'আয় যোগ করুন' : undefined}
          onAction={isCurrent ? () => router.push({ pathname: '/add', params: { type: 'income' } }) : undefined}
        />
      ) : (
        <View style={{ backgroundColor: tokens.surface, borderColor: tokens.line, borderWidth: 1, borderRadius: 14, overflow: 'hidden' }}>
          {monthIncomes.map((i, idx) => {
            const src = incomeSourceMeta(i.source);
            const title = i.note || src?.label || 'আয়';
            return (
              <Pressable
                key={i.id}
                onPress={() => editIncome(i.id)}
                accessibilityRole="button"
                accessibilityLabel={`${title}, ${formatTaka(i.amount)}`}
                accessibilityHint="এডিট করতে ট্যাপ করুন"
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 11,
                  paddingHorizontal: 14,
                  borderTopWidth: idx === 0 ? 0 : 1,
                  borderTopColor: tokens.line,
                  opacity: pressed ? 0.7 : 1,
                })}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: withAlpha(tokens.income, 0.12),
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Icon name={src?.iconName ?? 'arrow-down'} size={19} color={tokens.income} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '600', color: tokens.ink }}>
                    {title}
                  </Text>
                  <Text style={{ fontSize: 12.5, color: tokens.muted }}>
                    {dayMonthBn(i.date)}
                    {i.note && src ? ` · ${src.label}` : ''}
                  </Text>
                </View>
                <AmountText paisa={i.amount} signed size={14} color={tokens.income} />
              </Pressable>
            );
          })}
        </View>
      )}

      <SectionHeader title="মাসের ইতিহাস" />
      {history.length === 0 ? (
        <Text style={{ color: tokens.muted, fontSize: 13, lineHeight: 20, paddingHorizontal: 4 }}>
          এখনো কোনো মাস শেষ হয়নি — মাস শেষ হলে এখানে তার সারসংক্ষেপ দেখাবে।
        </Text>
      ) : (
        <View style={{ gap: 9 }}>
          {history.map((s) => (
            <HistoryRow key={s.id} summary={s} />
          ))}
        </View>
      )}

      <Text style={{ marginTop: 22, marginBottom: 10, fontSize: 12.5, color: tokens.muted, textAlign: 'center' }}>
        {monthLabelBn(monthKey)}-এর পূর্ণ রিপোর্ট — সারসংক্ষেপ, আয়, দিনভিত্তিক খরচ ও লোন
      </Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button
          label="PDF শেয়ার"
          icon="share-outline"
          loading={exporting === 'share'}
          disabled={exporting === 'save'}
          onPress={() => void exportPdf('share')}
          style={{ flex: 1 }}
        />
        <Button
          label="PDF সেভ"
          icon="download-outline"
          variant="outline"
          loading={exporting === 'save'}
          disabled={exporting === 'share'}
          onPress={() => void exportPdf('save')}
          style={{ flex: 1 }}
        />
      </View>

      <MonthPicker
        visible={pickerOpen}
        months={months}
        value={monthKey}
        current={thisMonth}
        incomes={incomes}
        expenses={expenses}
        onClose={() => setPickerOpen(false)}
        onSelect={(key) => {
          setMonthKey(key);
          setPickerOpen(false);
        }}
      />
    </Screen>
  );
}

function Divider() {
  const { tokens } = useTheme();
  return <View style={{ height: 1, backgroundColor: tokens.line }} />;
}

function BreakRow({ label, value, color }: { label: string; value: string; color: string }) {
  const { tokens } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 13, paddingHorizontal: 16 }}>
      <Text style={{ fontSize: 13.5, color: tokens.muted }}>{label}</Text>
      <Text style={{ fontSize: 13.5, fontWeight: '600', color, fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );
}

function DayCard({
  group,
  relative,
  open,
  onToggle,
  onEdit,
}: {
  group: DayExpenses;
  relative: string;
  open: boolean;
  onToggle: () => void;
  onEdit: (expenseId: string) => void;
}) {
  const { tokens } = useTheme();
  const date = group.items[0].date;
  const count = `${localDigits(group.items.length)}টি খরচ`;
  return (
    <View style={{ backgroundColor: tokens.surface, borderColor: tokens.line, borderWidth: 1, borderRadius: 14, overflow: 'hidden' }}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${dayMonthBn(date)}, ${relative}, ${count}, মোট ${formatTaka(group.total)}`}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 11,
          paddingHorizontal: 14,
          opacity: pressed ? 0.8 : 1,
        })}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: withAlpha(tokens.expense, 0.12),
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: tokens.ink }}>{localDigits(new Date(date).getDate())}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: tokens.ink }}>{dayMonthBn(date)}</Text>
          <Text style={{ fontSize: 12.5, color: tokens.muted }}>
            {relative} · {count}
          </Text>
        </View>
        <AmountText paisa={group.total} size={14} weight="700" color={tokens.expense} />
        <Icon name={open ? 'chevron-down' : 'chevron-forward'} size={16} color={tokens.muted} />
      </Pressable>
      {open
        ? group.items.map((e) => {
            const meta = categoryMeta(e.category);
            const title = e.description || meta.label;
            return (
              <Pressable
                key={e.id}
                onPress={() => onEdit(e.id)}
                accessibilityRole="button"
                accessibilityLabel={`${title}, ${formatTaka(e.amount)}`}
                accessibilityHint="এডিট করতে ট্যাপ করুন"
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 10,
                  paddingLeft: 14,
                  paddingRight: 44,
                  borderTopWidth: 1,
                  borderTopColor: tokens.line,
                  backgroundColor: tokens.surface2,
                  opacity: pressed ? 0.7 : 1,
                })}>
                <View style={{ width: 40, alignItems: 'center' }}>
                  <Icon name={meta.iconName} size={19} color={tokens.muted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontSize: 13.5, color: tokens.ink }}>
                    {title}
                  </Text>
                  {e.description ? <Text style={{ fontSize: 12, color: tokens.muted }}>{meta.label}</Text> : null}
                </View>
                <AmountText paisa={-e.amount} signed size={13.5} color={tokens.expense} />
              </Pressable>
            );
          })
        : null}
    </View>
  );
}

function MonthPicker({
  visible,
  months,
  value,
  current,
  incomes,
  expenses,
  onSelect,
  onClose,
}: {
  visible: boolean;
  months: MonthKey[];
  value: MonthKey;
  current: MonthKey;
  incomes: Income[];
  expenses: Expense[];
  onSelect: (key: MonthKey) => void;
  onClose: () => void;
}) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
        {/* Inner Pressable swallows taps so only the backdrop closes the sheet. */}
        <Pressable
          onPress={() => {}}
          accessibilityViewIsModal
          style={{
            maxHeight: '70%',
            width: '100%',
            maxWidth: 520,
            alignSelf: 'center',
            backgroundColor: tokens.bg,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            paddingTop: 18,
            paddingHorizontal: 18,
            paddingBottom: 16 + insets.bottom,
          }}>
          <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: '700', color: tokens.ink, marginBottom: 12 }}>
            মাস বাছাই করুন
          </Text>
          <ScrollView contentContainerStyle={{ gap: 8 }} showsVerticalScrollIndicator={false}>
            {months.map((key) => {
              const selected = key === value;
              return (
                <Pressable
                  key={key}
                  onPress={() => onSelect(key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    borderRadius: 14,
                    borderWidth: 1,
                    backgroundColor: selected ? withAlpha(tokens.primary, 0.12) : tokens.surface,
                    borderColor: selected ? tokens.primary : tokens.line,
                    opacity: pressed ? 0.8 : 1,
                  })}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14.5, fontWeight: '600', color: selected ? tokens.primary : tokens.ink }}>
                      {monthLabelBn(key)}
                      {key === current ? ' · চলতি' : ''}
                    </Text>
                    <Text style={{ fontSize: 12.5, color: tokens.muted }}>
                      আয় <Text style={{ color: tokens.income }}>{formatTaka(monthIncome(incomes, key))}</Text> · খরচ{' '}
                      <Text style={{ color: tokens.expense }}>{formatTaka(monthDailyExpense(expenses, key))}</Text>
                    </Text>
                  </View>
                  {selected ? <Icon name="checkmark" size={20} color={tokens.primary} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function HistoryRow({ summary }: { summary: MonthlySummary }) {
  const { tokens } = useTheme();
  const key = `${summary.year}-${String(summary.month).padStart(2, '0')}`;
  const untrackedIncome = summary.untrackedExpense < 0;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 13,
        backgroundColor: tokens.surface,
        borderColor: tokens.line,
        borderWidth: 1,
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 14,
      }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: tokens.ink }}>{monthLabelBn(key)}</Text>
        <Text style={{ fontSize: 12.5, color: tokens.muted, lineHeight: 18 }}>
          শুরু {formatTaka(summary.openingBalance)} · খরচ{' '}
          <Text style={{ color: tokens.expense }}>{formatTaka(summary.totalDailyExpense)}</Text>
        </Text>
        <Text style={{ fontSize: 12.5, color: tokens.muted }}>
          {untrackedIncome ? 'আনট্র্যাকড আয়' : 'আনট্র্যাকড খরচ'} {formatTaka(Math.abs(summary.untrackedExpense))}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <AmountText
          paisa={summary.monthlySaving}
          signed
          size={14.5}
          color={summary.monthlySaving >= 0 ? tokens.income : tokens.expense}
        />
        <Text style={{ fontSize: 12, color: tokens.muted }}>শেষে {formatTaka(summary.closingBalance)}</Text>
      </View>
    </View>
  );
}
