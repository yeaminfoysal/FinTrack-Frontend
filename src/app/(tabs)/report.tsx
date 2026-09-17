import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { CategoryBars, SavingBars, type MonthSaving } from '@/components/charts';
import { MonthSwitcher, useMonthsWithData } from '@/components/month-switcher';
import { PageTitle } from '@/components/page-title';
import { AmountText } from '@/components/ui/amount-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ListGroup, ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import { textSize } from '@/constants/typography';
import { useDashboard } from '@/hooks/use-dashboard';
import { categoryTotals, computeDashboard } from '@/lib/calc';
import {
  currentMonthKey,
  monthLabelBn,
  monthName,
  monthsEndingAt,
  nextMonthKey,
  parseMonthKey,
  type MonthKey,
} from '@/lib/date';
import { localDigits } from '@/lib/digits';
import { formatTaka } from '@/lib/money';
import { buildMonthReportHtml } from '@/lib/report-html';
import { saveReportPdf, shareReportPdf } from '@/lib/report-pdf';
import type { MonthlySummary } from '@/lib/types';
import { useTheme } from '@/providers/theme-provider';
import { useDataStore } from '@/stores/data';
import { showToast } from '@/stores/ui';

const TREND_MONTHS = 6;

export default function ReportScreen() {
  const { tokens } = useTheme();
  const thisMonth = currentMonthKey();
  const [monthKey, setMonthKey] = useState<MonthKey>(thisMonth);
  const months = useMonthsWithData();

  const { snapshot } = useDashboard(monthKey);
  const incomes = useDataStore((s) => s.incomes);
  const expenses = useDataStore((s) => s.expenses);
  const summaries = useDataStore((s) => s.summaries);
  const loans = useDataStore((s) => s.loans);
  const customCategories = useDataStore((s) => s.categories);
  const practicals = useDataStore((s) => s.practicals);
  const profile = useDataStore((s) => s.profile);
  const [exporting, setExporting] = useState<'share' | 'save' | null>(null);

  const categories = useMemo(() => categoryTotals(expenses, monthKey), [expenses, monthKey]);
  const trend = useMemo<MonthSaving[]>(
    () =>
      monthsEndingAt(monthKey, TREND_MONTHS).map((key) => ({
        key,
        saving: computeDashboard({
          monthKey: key,
          incomes,
          expenses,
          loans,
          summaries,
          baseOpening: profile.openingSavings,
          practical: practicals[key]?.amount ?? null,
        }).saving,
      })),
    [monthKey, incomes, expenses, loans, summaries, practicals, profile.openingSavings],
  );
  const trendTotal = trend.reduce((sum, m) => sum + m.saving, 0);
  // Months before the first entry are empty bars; leave them out of the average. Shown in whole taka.
  const trendMonthsWithData = Math.max(1, trend.filter((m) => m.key >= months[months.length - 1]).length);
  const trendAverage = Math.round(trendTotal / trendMonthsWithData / 100) * 100;
  const history = useMemo(
    () => summaries.filter((s) => !s.isDeleted).sort((a, b) => b.year - a.year || b.month - a.month),
    [summaries],
  );

  const isCurrent = monthKey === thisMonth;
  const monthTitle = isCurrent ? 'এই মাসের' : `${monthName(parseMonthKey(monthKey).month)} মাসের`;
  const closing = snapshot.opening + snapshot.saving;
  const spent = snapshot.monthDailyExpense + Math.max(snapshot.untracked, 0);
  const savedPct = snapshot.monthIncome > 0 ? Math.max(0, Math.min(100, (snapshot.saving / snapshot.monthIncome) * 100)) : 0;
  const nextOpeningLabel = monthName(parseMonthKey(nextMonthKey(monthKey)).month);

  const exportPdf = async (mode: 'share' | 'save') => {
    setExporting(mode);
    try {
      const html = buildMonthReportHtml({ monthKey, snapshot, incomes, expenses, loans, categories: customCategories, userName: profile.name });
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
      <PageTitle title="রিপোর্ট" />
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
          <Text accessibilityRole="header" numberOfLines={1} style={{ fontSize: textSize.xl, fontWeight: '700', color: tokens.ink }}>
            মাসিক রিপোর্ট
          </Text>
          <Text numberOfLines={1} style={{ fontSize: textSize.sm, color: tokens.muted }}>
            আয়, খরচ ও সঞ্চয়ের হিসাব
          </Text>
        </View>
        <MonthSwitcher value={monthKey} onChange={setMonthKey} months={months} />
      </View>

      {/* Saving hero */}
      <View style={{ borderRadius: 20, padding: 18, backgroundColor: tokens.primaryFill, marginBottom: 16 }}>
        <Text style={{ fontSize: textSize.md, color: tokens.onFill }}>{monthTitle} সঞ্চয়</Text>
        <AmountText
          paisa={snapshot.saving}
          size="display"
          weight="700"
          color={tokens.onFill}
          numberOfLines={1}
          style={{ marginTop: 4, marginBottom: 14 }}
        />
        <View
          accessible
          accessibilityLabel={`আয়ের ${localDigits(Math.round(savedPct))}% সঞ্চয় হয়েছে`}
          style={{ flexDirection: 'row', height: 10, borderRadius: 6, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.22)' }}>
          <View style={{ width: `${savedPct}%`, backgroundColor: tokens.onFill }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
          <Text style={{ fontSize: textSize.sm, color: tokens.onFill }}>আয় {formatTaka(snapshot.monthIncome)}</Text>
          <Text style={{ fontSize: textSize.sm, color: tokens.onFill }}>খরচ {formatTaka(spent)}</Text>
        </View>
      </View>

      {/* Summary */}
      <ListGroup>
        <BreakRow label="ওপেনিং ব্যালেন্স" value={formatTaka(snapshot.opening)} color={tokens.ink} />
        <BreakRow divider label="মোট আয়" value={`+ ${formatTaka(snapshot.monthIncome)}`} color={tokens.income} />
        <BreakRow divider label="দৈনিক খরচ" value={`− ${formatTaka(snapshot.monthDailyExpense)}`} color={tokens.expense} />
        <BreakRow divider label="পাওনা (বাকি)" value={formatTaka(snapshot.outstandingLent)} color={tokens.lent} />
        <BreakRow divider label="দেনা (বাকি)" value={formatTaka(snapshot.outstandingBorrowed)} color={tokens.borrowed} />
        <BreakRow
          divider
          label={snapshot.untracked < 0 ? 'আনট্র্যাকড আয়' : 'আনট্র্যাকড খরচ'}
          value={formatTaka(Math.abs(snapshot.untracked))}
          color={snapshot.untracked < 0 ? tokens.income : tokens.borrowed}
        />
        <BreakRow divider label="নেট ওয়ার্থ" value={formatTaka(snapshot.netWorth)} color={tokens.ink} />
        <BreakRow divider strong label="ক্লোজিং ব্যালেন্স" value={formatTaka(closing)} color={tokens.ink} />
      </ListGroup>

      <Card
        soft
        radius={14}
        style={{ marginTop: 14, borderStyle: 'dashed', paddingVertical: 12, paddingHorizontal: 15, flexDirection: 'row', gap: 10 }}>
        <Icon name="repeat-outline" size={18} color={tokens.muted} />
        <Text style={{ flex: 1, fontSize: textSize.sm, color: tokens.muted, lineHeight: 19 }}>
          <Text style={{ color: tokens.ink, fontWeight: '700' }}>ক্যারি ফরোয়ার্ড:</Text> {nextOpeningLabel} মাসের ওপেনিং ={' '}
          {formatTaka(snapshot.opening)} + {formatTaka(snapshot.saving)} ={' '}
          <Text style={{ color: tokens.ink, fontWeight: '600' }}>{formatTaka(closing)}</Text>
        </Text>
      </Card>

      {/* Category chart */}
      <SectionHeader title="ক্যাটাগরি অনুযায়ী খরচ" />
      <Card padding={16}>
        {categories.length > 0 ? (
          <CategoryBars items={categories} />
        ) : (
          <Text style={{ fontSize: textSize.sm, color: tokens.muted, textAlign: 'center', paddingVertical: 6 }}>
            এই মাসে কোনো খরচ লেখা হয়নি।
          </Text>
        )}
      </Card>

      {/* Saving trend */}
      <SectionHeader title={`${localDigits(TREND_MONTHS)} মাসের সঞ্চয়`} />
      <Card padding={16}>
        <SavingBars months={trend} selected={monthKey} onSelect={setMonthKey} />
        <View style={{ height: 1, backgroundColor: tokens.line, marginVertical: 12 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          <TrendStat label={`${localDigits(TREND_MONTHS)} মাসে মোট`} paisa={trendTotal} />
          <TrendStat label="মাসে গড়" paisa={trendAverage} alignEnd />
        </View>
      </Card>

      {/* History */}
      <SectionHeader title="মাসের ইতিহাস" />
      {history.length === 0 ? (
        <Text style={{ color: tokens.muted, fontSize: textSize.sm, lineHeight: 20, paddingHorizontal: 4 }}>
          এখনো কোনো মাস শেষ হয়নি — মাস শেষ হলে এখানে তার সারসংক্ষেপ দেখাবে।
        </Text>
      ) : (
        <ListGroup>
          {history.map((s, idx) => (
            <HistoryRow key={s.id} summary={s} divider={idx > 0} selectedMonth={monthKey} onSelect={setMonthKey} />
          ))}
        </ListGroup>
      )}

      <Text style={{ marginTop: 22, marginBottom: 10, fontSize: textSize.sm, color: tokens.muted, textAlign: 'center' }}>
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
    </Screen>
  );
}

function BreakRow({
  label,
  value,
  color,
  divider,
  strong,
}: {
  label: string;
  value: string;
  color: string;
  divider?: boolean;
  strong?: boolean;
}) {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderTopWidth: divider ? 1 : 0,
        borderTopColor: tokens.line,
        backgroundColor: strong ? tokens.surface2 : 'transparent',
      }}>
      <Text style={{ fontSize: textSize.md, fontWeight: strong ? '700' : '400', color: strong ? tokens.ink : tokens.muted }}>
        {label}
      </Text>
      <Text style={{ fontSize: textSize.md, fontWeight: strong ? '700' : '600', color, fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
    </View>
  );
}

function TrendStat({ label, paisa, alignEnd }: { label: string; paisa: number; alignEnd?: boolean }) {
  const { tokens } = useTheme();
  return (
    <View style={{ alignItems: alignEnd ? 'flex-end' : 'flex-start' }}>
      <Text style={{ fontSize: textSize.sm, color: tokens.muted }}>{label}</Text>
      <AmountText paisa={paisa} signed weight="700" color={paisa >= 0 ? tokens.income : tokens.expense} />
    </View>
  );
}

function HistoryRow({
  summary,
  divider,
  selectedMonth,
  onSelect,
}: {
  summary: MonthlySummary;
  divider: boolean;
  selectedMonth: MonthKey;
  onSelect: (key: MonthKey) => void;
}) {
  const { tokens } = useTheme();
  const key = `${summary.year}-${String(summary.month).padStart(2, '0')}`;
  const untrackedIncome = summary.untrackedExpense < 0;
  return (
    <ListRow
      title={monthLabelBn(key)}
      divider={divider}
      selected={key === selectedMonth}
      onPress={() => onSelect(key)}
      accessibilityHint="এই মাসের রিপোর্ট দেখাবে"
      subtitle={
        <>
          খরচ <Text style={{ color: tokens.expense }}>{formatTaka(summary.totalDailyExpense)}</Text> ·{' '}
          {untrackedIncome ? 'আনট্র্যাকড আয়' : 'আনট্র্যাকড'} {formatTaka(Math.abs(summary.untrackedExpense))}
        </>
      }
      trailing={
        <View style={{ alignItems: 'flex-end', gap: 1 }}>
          <AmountText
            paisa={summary.monthlySaving}
            signed
            color={summary.monthlySaving >= 0 ? tokens.income : tokens.expense}
          />
          <Text style={{ fontSize: textSize.xs, color: tokens.muted }}>শেষে {formatTaka(summary.closingBalance)}</Text>
        </View>
      }
    />
  );
}
