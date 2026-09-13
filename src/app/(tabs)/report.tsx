import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmountText } from '@/components/ui/amount-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { categoryMeta, INCOME_SOURCES } from '@/constants/categories';
import { withAlpha } from '@/constants/tokens';
import { useDashboard } from '@/hooks/use-dashboard';
import { dailyExpenses, monthDailyExpense, monthIncome, type DayExpenses } from '@/lib/calc';
import {
  currentMonthKey,
  dayKeyOf,
  dayMonthBn,
  daysInMonth,
  isInMonth,
  monthKeyOf,
  monthLabelBn,
  monthName,
  nextMonthKey,
  parseMonthKey,
  prevMonthKey,
  toBnDigits,
  weekdayBn,
  type DayKey,
  type MonthKey,
} from '@/lib/date';
import { formatTaka } from '@/lib/money';
import { buildMonthReportHtml } from '@/lib/report-html';
import { reportFileName, saveReportPdf, shareReportPdf } from '@/lib/report-pdf';
import type { Expense, Income, MonthlySummary } from '@/lib/types';
import { useTheme } from '@/providers/theme-provider';
import { useDataStore } from '@/stores/data';

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
  const nextOpeningLabel = monthName(Number(nextMonthKey(monthKey).split('-')[1]));

  // Running month averages over the days elapsed so far; past months over the whole month.
  const now = new Date();
  const elapsedDays = isCurrent ? now.getDate() : daysInMonth(monthKey);
  const dailyAverage = Math.round(snapshot.monthDailyExpense / elapsedDays);
  const today = dayKeyOf(now.toISOString());
  const yesterday = dayKeyOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString());

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
        if (saved.status === 'saved') {
          Alert.alert('PDF সেভ হয়েছে', `${reportFileName(monthKey)}\n"${saved.folder}" ফোল্ডারে রাখা হয়েছে।`);
        }
      }
    } catch (e) {
      console.warn('[report] PDF export failed:', e);
      Alert.alert('PDF তৈরি করা যায়নি', e instanceof Error ? e.message : 'আবার চেষ্টা করুন।');
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
          marginTop: 8,
          marginBottom: 18,
        }}>
        <View>
          <Text style={{ fontSize: 20, fontWeight: '700', color: tokens.ink }}>মাসিক রিপোর্ট</Text>
          <Text style={{ fontSize: 12, color: tokens.muted }}>পুরো মাসের সারসংক্ষেপ</Text>
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
          <PillArrow glyph="‹" disabled={!canPrev} onPress={() => setMonthKey(prevMonthKey(monthKey))} />
          <Pressable onPress={() => setPickerOpen(true)} hitSlop={6} style={{ paddingVertical: 8 }}>
            <Text style={{ fontSize: 12.5, fontWeight: '600', color: tokens.ink }}>{monthLabelBn(monthKey)} ▾</Text>
          </Pressable>
          <PillArrow glyph="›" disabled={!canNext} onPress={() => setMonthKey(nextMonthKey(monthKey))} />
        </View>
      </View>

      {/* Saving hero */}
      <View style={{ borderRadius: 20, padding: 18, backgroundColor: tokens.primary, marginBottom: 16 }}>
        <Text style={{ fontSize: 12.5, color: tokens.onPrimary, opacity: 0.85 }}>{monthTitle} সঞ্চয়</Text>
        <AmountText paisa={snapshot.saving} size={30} weight="700" color={tokens.onPrimary} style={{ marginTop: 4, marginBottom: 14 }} />
        <View style={{ flexDirection: 'row', height: 10, borderRadius: 6, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.2)' }}>
          <View style={{ width: `${savedPct}%`, backgroundColor: 'rgba(255,255,255,0.95)' }} />
          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.45)' }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 }}>
          <Text style={{ fontSize: 11, color: tokens.onPrimary, opacity: 0.85 }}>আয় {formatTaka(snapshot.monthIncome)}</Text>
          <Text style={{ fontSize: 11, color: tokens.onPrimary, opacity: 0.85 }}>খরচ {formatTaka(spent)}</Text>
        </View>
      </View>

      {/* Breakdown */}
      <View style={{ backgroundColor: tokens.surface, borderColor: tokens.line, borderWidth: 1, borderRadius: 18, overflow: 'hidden' }}>
        <BreakRow label="ওপেনিং ব্যালেন্স" value={formatTaka(snapshot.opening)} color={tokens.ink} />
        <Divider />
        <BreakRow label="মোট আয়" value={`+ ${formatTaka(snapshot.monthIncome)}`} color={tokens.income} />
        <Divider />
        <BreakRow label="মোট খরচ (Daily)" value={`− ${formatTaka(snapshot.monthDailyExpense)}`} color={tokens.expense} />
        <Divider />
        <BreakRow label="পাওনা (Outstanding Lent)" value={formatTaka(snapshot.outstandingLent)} color={tokens.lent} />
        <Divider />
        <BreakRow label="দেনা (Outstanding Borrowed)" value={formatTaka(snapshot.outstandingBorrowed)} color={tokens.borrowed} />
        <Divider />
        <BreakRow
          label={snapshot.untracked < 0 ? 'আনট্র্যাকড আয়' : 'আনট্র্যাকড খরচ'}
          value={formatTaka(Math.abs(snapshot.untracked))}
          color={snapshot.untracked < 0 ? tokens.income : tokens.borrowed}
        />
        <Divider />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, backgroundColor: tokens.surface2 }}>
          <Text style={{ fontSize: 13.5, fontWeight: '700', color: tokens.ink }}>ক্লোজিং ব্যালেন্স</Text>
          <Text style={{ fontSize: 13.5, fontWeight: '700', color: tokens.ink, fontVariant: ['tabular-nums'] }}>{formatTaka(closing)}</Text>
        </View>
      </View>

      <Card soft radius={14} style={{ marginTop: 14, borderStyle: 'dashed', paddingVertical: 12, paddingHorizontal: 15 }}>
        <Text style={{ fontSize: 11.5, color: tokens.muted, lineHeight: 18 }}>
          ↻ <Text style={{ color: tokens.ink, fontWeight: '700' }}>ক্যারি ফরোয়ার্ড:</Text> {nextOpeningLabel} মাসের ওপেনিং = {formatTaka(snapshot.opening)} + {formatTaka(snapshot.saving)} ={' '}
          <Text style={{ color: tokens.ink, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{formatTaka(closing)}</Text>
        </Text>
      </Card>

      {/* Day-wise expenses */}
      <SectionHeader
        title="দিনভিত্তিক খরচ"
        actionLabel={days.length > 0 ? (allOpen ? 'সব বন্ধ করুন' : 'সব খুলুন') : undefined}
        onAction={toggleAll}
      />
      {days.length > 0 ? (
        <Text style={{ fontSize: 11.5, color: tokens.muted, marginTop: -4, marginBottom: 10, paddingHorizontal: 4 }}>
          {toBnDigits(days.length)} দিনে মোট{' '}
          <Text style={{ color: tokens.expense, fontWeight: '600' }}>{formatTaka(snapshot.monthDailyExpense)}</Text> · দৈনিক গড়{' '}
          <Text style={{ color: tokens.ink, fontWeight: '600' }}>{formatTaka(dailyAverage)}</Text>
        </Text>
      ) : null}
      {days.length > 0 || monthIncomes.length > 0 ? (
        <Text style={{ fontSize: 11, color: tokens.muted, marginTop: -4, marginBottom: 10, paddingHorizontal: 4 }}>
          ✎ যেকোনো খরচ বা আয়ে ট্যাপ করে এডিট বা ডিলিট করুন
        </Text>
      ) : null}
      <View style={{ gap: 9 }}>
        {days.length === 0 ? (
          <Text style={{ color: tokens.muted, fontSize: 13, paddingHorizontal: 4 }}>এই মাসে কোনো খরচ নেই।</Text>
        ) : (
          days.map((d, idx) => (
            <DayCard
              key={d.day}
              group={d}
              relative={d.day === today ? 'আজ' : d.day === yesterday ? 'গতকাল' : weekdayBn(d.items[0].date)}
              open={isDayOpen(d.day, idx)}
              onToggle={() => setOpenDays((o) => ({ ...o, [d.day]: !isDayOpen(d.day, idx) }))}
              onEdit={editExpense}
            />
          ))
        )}
      </View>

      {/* Incomes of the month */}
      <SectionHeader title="আয়ের তালিকা" />
      {monthIncomes.length === 0 ? (
        <Text style={{ color: tokens.muted, fontSize: 13, paddingHorizontal: 4 }}>এই মাসে কোনো আয় নেই।</Text>
      ) : (
        <View style={{ backgroundColor: tokens.surface, borderColor: tokens.line, borderWidth: 1, borderRadius: 14, overflow: 'hidden' }}>
          {monthIncomes.map((i, idx) => {
            const src = INCOME_SOURCES.find((s) => s.key === i.source);
            return (
              <Pressable
                key={i.id}
                onPress={() => editIncome(i.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 11,
                  paddingHorizontal: 14,
                  borderTopWidth: idx === 0 ? 0 : 1,
                  borderTopColor: tokens.line,
                }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: withAlpha(tokens.income, 0.12),
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Text style={{ fontSize: 17 }}>{src?.icon ?? '↓'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontSize: 13.5, fontWeight: '600', color: tokens.ink }}>
                    {i.note || src?.label || 'আয়'}
                  </Text>
                  <Text style={{ fontSize: 11, color: tokens.muted }}>
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

      <SectionHeader title="মাসের ইতিহাস" actionLabel="Opening → Closing" />
      <View style={{ gap: 9 }}>
        {history.length === 0 ? (
          <Text style={{ color: tokens.muted, fontSize: 13, paddingHorizontal: 4 }}>এখনো কোনো ক্লোজড মাস নেই।</Text>
        ) : (
          history.map((s) => <HistoryRow key={s.id} summary={s} />)
        )}
      </View>
      <Text style={{ marginTop: 9, textAlign: 'center', fontSize: 11, color: tokens.muted }}>
        stored MonthlySummary · <Text style={{ color: tokens.income }}>●</Text> Synced · client-authoritative
      </Text>

      <Text style={{ marginTop: 18, marginBottom: 8, fontSize: 11.5, color: tokens.muted, textAlign: 'center' }}>
        {monthLabelBn(monthKey)}-এর পূর্ণ রিপোর্ট — সারসংক্ষেপ, আয়, দিনভিত্তিক খরচ ও লোন
      </Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button
          label="PDF শেয়ার"
          leftGlyph="⤴"
          variant="danger"
          loading={exporting === 'share'}
          disabled={exporting === 'save'}
          onPress={() => exportPdf('share')}
          style={{ flex: 1 }}
        />
        <Button
          label="PDF সেভ"
          leftGlyph="⤓"
          variant="outline"
          color={tokens.expense}
          loading={exporting === 'save'}
          disabled={exporting === 'share'}
          onPress={() => exportPdf('save')}
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

function PillArrow({ glyph, disabled, onPress }: { glyph: string; disabled: boolean; onPress: () => void }) {
  const { tokens } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={6} style={{ paddingVertical: 6, paddingHorizontal: 11 }}>
      <Text style={{ fontSize: 17, lineHeight: 20, fontWeight: '600', color: tokens.ink, opacity: disabled ? 0.25 : 1 }}>{glyph}</Text>
    </Pressable>
  );
}

function Divider() {
  const { tokens } = useTheme();
  return <View style={{ height: 1, backgroundColor: tokens.line }} />;
}

function BreakRow({ label, value, color }: { label: string; value: string; color: string }) {
  const { tokens } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 16 }}>
      <Text style={{ fontSize: 13, color: tokens.muted }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '600', color, fontVariant: ['tabular-nums'] }}>{value}</Text>
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
  return (
    <View style={{ backgroundColor: tokens.surface, borderColor: tokens.line, borderWidth: 1, borderRadius: 14, overflow: 'hidden' }}>
      <Pressable
        onPress={onToggle}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 14 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: withAlpha(tokens.expense, 0.12),
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: tokens.expense }}>{toBnDigits(new Date(date).getDate())}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13.5, fontWeight: '600', color: tokens.ink }}>{dayMonthBn(date)}</Text>
          <Text style={{ fontSize: 11, color: tokens.muted }}>
            {relative} · {toBnDigits(group.items.length)}টি খরচ
          </Text>
        </View>
        <AmountText paisa={group.total} size={14} weight="700" color={tokens.expense} />
        <Text style={{ width: 14, textAlign: 'center', fontSize: 12, color: tokens.muted }}>{open ? '▾' : '▸'}</Text>
      </Pressable>
      {open
        ? group.items.map((e) => {
            const meta = categoryMeta(e.category);
            return (
              <Pressable
                key={e.id}
                onPress={() => onEdit(e.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 10,
                  paddingLeft: 14,
                  paddingRight: 40,
                  borderTopWidth: 1,
                  borderTopColor: tokens.line,
                  backgroundColor: tokens.surface2,
                }}>
                <Text style={{ width: 40, textAlign: 'center', fontSize: 17 }}>{meta.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontSize: 13, color: tokens.ink }}>
                    {e.description || meta.label}
                  </Text>
                  <Text style={{ fontSize: 10.5, color: tokens.muted }}>{e.description ? meta.label : meta.en}</Text>
                </View>
                <AmountText paisa={-e.amount} signed size={13} color={tokens.expense} />
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
          style={{
            maxHeight: '70%',
            backgroundColor: tokens.bg,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            paddingTop: 18,
            paddingHorizontal: 18,
            paddingBottom: 16 + insets.bottom,
          }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: tokens.ink, marginBottom: 12 }}>মাস বাছাই করুন</Text>
          <ScrollView contentContainerStyle={{ gap: 8 }} showsVerticalScrollIndicator={false}>
            {months.map((key) => {
              const selected = key === value;
              return (
                <Pressable
                  key={key}
                  onPress={() => onSelect(key)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    borderRadius: 14,
                    borderWidth: 1,
                    backgroundColor: selected ? withAlpha(tokens.primary, 0.12) : tokens.surface,
                    borderColor: selected ? tokens.primary : tokens.line,
                  }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: selected ? tokens.primary : tokens.ink }}>
                      {monthLabelBn(key)}
                      {key === current ? ' · চলতি' : ''}
                    </Text>
                    <Text style={{ fontSize: 11, color: tokens.muted }}>
                      আয় <Text style={{ color: tokens.income }}>{formatTaka(monthIncome(incomes, key))}</Text> · খরচ{' '}
                      <Text style={{ color: tokens.expense }}>{formatTaka(monthDailyExpense(expenses, key))}</Text>
                    </Text>
                  </View>
                  {selected ? <Text style={{ fontSize: 16, fontWeight: '700', color: tokens.primary }}>✓</Text> : null}
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
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13.5, fontWeight: '600', color: tokens.ink }}>{monthLabelBn(key)}</Text>
        <Text style={{ fontSize: 11, color: tokens.muted }}>
          Opening {formatTaka(summary.openingBalance)} · খরচ{' '}
          <Text style={{ color: tokens.expense }}>{formatTaka(summary.totalDailyExpense)}</Text> · Untracked{' '}
          {formatTaka(summary.untrackedExpense)}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <AmountText paisa={summary.monthlySaving} signed size={14} color={summary.monthlySaving >= 0 ? tokens.income : tokens.expense} />
        <Text style={{ fontSize: 10.5, color: tokens.muted }}>Closing {formatTaka(summary.closingBalance)}</Text>
      </View>
    </View>
  );
}
