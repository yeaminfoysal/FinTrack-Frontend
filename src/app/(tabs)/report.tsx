import { Share, Text, View } from 'react-native';

import { AmountText } from '@/components/ui/amount-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { useDashboard } from '@/hooks/use-dashboard';
import { monthLabelBn, monthName, nextMonthKey } from '@/lib/date';
import { formatTaka } from '@/lib/money';
import type { MonthlySummary } from '@/lib/types';
import { useTheme } from '@/providers/theme-provider';
import { useDataStore } from '@/stores/data';

export default function ReportScreen() {
  const { tokens } = useTheme();
  const { snapshot, monthKey } = useDashboard();
  const summaries = useDataStore((s) => s.summaries);

  const closing = snapshot.opening + snapshot.saving;
  const spent = snapshot.monthDailyExpense + Math.max(snapshot.untracked, 0);
  const savedPct = snapshot.monthIncome > 0 ? Math.max(0, Math.min(100, (snapshot.saving / snapshot.monthIncome) * 100)) : 0;
  const nextOpeningLabel = monthName(Number(nextMonthKey(monthKey).split('-')[1]));

  const history = summaries.filter((s) => !s.isDeleted);

  const exportReport = async () => {
    const lines = [
      `📊 FinTrack — ${monthLabelBn(monthKey)}`,
      '',
      `ওপেনিং ব্যালেন্স: ${formatTaka(snapshot.opening)}`,
      `মোট আয়: ${formatTaka(snapshot.monthIncome)}`,
      `মোট খরচ (Daily): ${formatTaka(snapshot.monthDailyExpense)}`,
      `পাওনা (Outstanding Lent): ${formatTaka(snapshot.outstandingLent)}`,
      `দেনা (Outstanding Borrowed): ${formatTaka(snapshot.outstandingBorrowed)}`,
      `আনট্র্যাকড: ${formatTaka(Math.abs(snapshot.untracked))}`,
      `এই মাসের সঞ্চয়: ${formatTaka(snapshot.saving)}`,
      `ক্লোজিং ব্যালেন্স: ${formatTaka(closing)}`,
    ];
    await Share.share({ message: lines.join('\n') });
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
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 999,
          }}>
          <Text style={{ fontSize: 12.5, fontWeight: '600', color: tokens.ink }}>{monthLabelBn(monthKey)} ▾</Text>
        </View>
      </View>

      {/* Saving hero */}
      <View style={{ borderRadius: 20, padding: 18, backgroundColor: tokens.primary, marginBottom: 16 }}>
        <Text style={{ fontSize: 12.5, color: tokens.onPrimary, opacity: 0.85 }}>এই মাসের সঞ্চয়</Text>
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

      <Button label="PDF রিপোর্ট শেয়ার করুন" leftGlyph="⤓" variant="danger" onPress={exportReport} style={{ marginTop: 18 }} />
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
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 16 }}>
      <Text style={{ fontSize: 13, color: tokens.muted }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '600', color, fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
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
