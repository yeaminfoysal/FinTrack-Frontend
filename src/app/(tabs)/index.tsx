import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';

import { ActivityDayList } from '@/components/activity-list';
import { PageTitle } from '@/components/page-title';
import { PracticalBalanceSheet } from '@/components/practical-balance-sheet';
import { SyncBadge } from '@/components/sync-badge';
import { AmountText } from '@/components/ui/amount-text';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon, type IconName } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import { radii, withAlpha } from '@/constants/tokens';
import { textSize } from '@/constants/typography';
import { useDashboard } from '@/hooks/use-dashboard';
import { useSyncStatus } from '@/hooks/use-sync-status';
import { groupByDay } from '@/lib/activity';
import { monthLabelBn, monthName, parseMonthKey } from '@/lib/date';
import { formatTaka } from '@/lib/money';
import { useTheme } from '@/providers/theme-provider';

export default function DashboardScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const { snapshot, recent, profile, monthKey } = useDashboard();
  const sync = useSyncStatus();
  const [refreshing, setRefreshing] = useState(false);
  const [balanceOpen, setBalanceOpen] = useState(false);
  const recentDays = useMemo(() => groupByDay(recent), [recent]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await sync.syncNow();
    } finally {
      setRefreshing(false);
    }
  };

  const hasPractical = snapshot.practical != null;
  const untrackedIsIncome = snapshot.untracked < 0;
  const untrackedColor = untrackedIsIncome ? tokens.income : tokens.borrowed;
  const untrackedLabel = untrackedIsIncome ? 'আনট্র্যাকড আয়' : 'আনট্র্যাকড খরচ';
  // On narrow phones (~360dp) the full "সেপ্টেম্বর 2026" pill squeezes the greeting onto two lines.
  const compactHeader = useWindowDimensions().width < 400;

  return (
    <Screen refreshing={refreshing} onRefresh={sync.isDemo ? undefined : () => void refresh()}>
      <PageTitle title="হোম" />
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 18 }}>
        <Pressable
          onPress={() => router.push('/settings')}
          accessibilityRole="button"
          accessibilityLabel={`${profile.name} — প্রোফাইল ও সেটিংস`}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={profile.name} />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ fontSize: textSize.sm, color: tokens.muted }}>
              আসসালামু আলাইকুম
            </Text>
            <Text numberOfLines={1} style={{ fontSize: textSize.lg, fontWeight: '700', color: tokens.ink }}>
              {profile.name}
            </Text>
          </View>
        </Pressable>
        <Pressable
          onPress={() => router.push('/report')}
          accessibilityRole="button"
          accessibilityLabel={`${monthLabelBn(monthKey)} — মাসিক রিপোর্ট দেখুন`}
          style={({ pressed }) => ({
            minHeight: 40,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 12,
            borderRadius: 999,
            backgroundColor: tokens.surface,
            borderColor: tokens.line,
            borderWidth: 1,
            opacity: pressed ? 0.8 : 1,
          })}>
          {compactHeader ? null : <Icon name="calendar-outline" size={15} color={tokens.muted} />}
          <Text style={{ fontSize: textSize.sm, fontWeight: '600', color: tokens.ink }}>
            {compactHeader ? monthName(parseMonthKey(monthKey).month) : monthLabelBn(monthKey)}
          </Text>
        </Pressable>
        <IconButton icon="settings-outline" label="সেটিংস" onPress={() => router.push('/settings')} />
      </View>

      {/* Balance card */}
      <View
        style={{
          borderRadius: 24,
          padding: 22,
          backgroundColor: tokens.primaryFill,
          overflow: 'hidden',
          shadowColor: tokens.primaryFill,
          shadowOpacity: 0.35,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 14 },
          elevation: 6,
        }}>
        <View
          style={{
            position: 'absolute',
            right: -40,
            top: -40,
            width: 160,
            height: 160,
            borderRadius: 80,
            backgroundColor: 'rgba(255,255,255,0.07)',
          }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Text style={{ fontSize: textSize.md, fontWeight: '500', color: tokens.onFill }}>বর্তমান ব্যালেন্স</Text>
          <SyncBadge onFill />
        </View>
        <AmountText
          paisa={snapshot.theoretical}
          size="display"
          weight="700"
          color={tokens.onFill}
          numberOfLines={1}
          style={{ marginTop: 6 }}
        />
        <Text style={{ fontSize: textSize.sm, color: tokens.onFill }}>
          {hasPractical
            ? `বাস্তবে হাতে আছে ${formatTaka(snapshot.practical ?? 0)}`
            : 'হিসাব অনুযায়ী এখন হাতে যত থাকার কথা'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <MiniStat icon="arrow-down" label="এই মাসে আয়" value={snapshot.monthIncome} />
          <MiniStat icon="arrow-up" label="এই মাসে খরচ" value={snapshot.monthDailyExpense} />
        </View>
      </View>

      {/* Opening + saving */}
      <View style={{ flexDirection: 'row', gap: 11, marginTop: 14 }}>
        <Card style={{ flex: 1 }}>
          <Text style={{ fontSize: textSize.sm, color: tokens.muted }}>মাসের শুরুতে ছিল</Text>
          <AmountText paisa={snapshot.opening} size="xl" color={tokens.ink} numberOfLines={1} style={{ marginTop: 4 }} />
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={{ fontSize: textSize.sm, color: tokens.muted }}>এই মাসের সঞ্চয়</Text>
          <AmountText
            paisa={snapshot.saving}
            signed
            size="xl"
            numberOfLines={1}
            color={snapshot.saving >= 0 ? tokens.income : tokens.expense}
            style={{ marginTop: 4 }}
          />
        </Card>
      </View>

      {/* Loans — one line */}
      <Pressable
        onPress={() => router.push('/loans')}
        accessibilityRole="button"
        accessibilityLabel={`পাওনা ${formatTaka(snapshot.outstandingLent)}, দেনা ${formatTaka(snapshot.outstandingBorrowed)}`}
        accessibilityHint="পাওনা-দেনা পেজ খুলবে"
        style={({ pressed }) => ({
          marginTop: 11,
          minHeight: 52,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: radii.lg,
          backgroundColor: tokens.surface,
          borderColor: tokens.line,
          borderWidth: 1,
          opacity: pressed ? 0.85 : 1,
        })}>
        <LoanFigure label="পাওনা" amount={snapshot.outstandingLent} color={tokens.lent} />
        <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: tokens.line }} />
        <LoanFigure label="দেনা" amount={snapshot.outstandingBorrowed} color={tokens.borrowed} />
        <Icon name="chevron-forward" size={16} color={tokens.muted} />
      </Pressable>

      {/* Untracked — opens the reconcile sheet */}
      <Pressable
        onPress={() => setBalanceOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={
          hasPractical ? `${untrackedLabel} ${formatTaka(Math.abs(snapshot.untracked))}` : 'বাস্তবে হাতে কত আছে লিখুন'
        }
        accessibilityHint="হিসাব মেলানোর শিট খুলবে"
        style={({ pressed }) => ({
          marginTop: 11,
          borderRadius: radii.lg,
          padding: 15,
          backgroundColor: tokens.surface,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: hasPractical ? untrackedColor : tokens.line,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 13,
          opacity: pressed ? 0.85 : 1,
        })}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: withAlpha(hasPractical ? untrackedColor : tokens.primary, 0.12),
          }}>
          <Icon
            name={hasPractical ? 'help-circle-outline' : 'wallet-outline'}
            size={22}
            color={hasPractical ? untrackedColor : tokens.primary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: textSize.md, fontWeight: '600', color: tokens.ink }}>
            {hasPractical ? untrackedLabel : 'হাতে কত আছে লিখুন'}
          </Text>
          <Text style={{ fontSize: textSize.sm, color: tokens.muted }}>
            {hasPractical
              ? untrackedIsIncome
                ? 'লেখা হয়নি এমন টাকা হাতে এসেছে'
                : 'হিসাবের বাইরে খরচ হয়ে গেছে'
              : 'তাহলে হিসাবের বাইরের খরচ ধরা পড়বে'}
          </Text>
        </View>
        {hasPractical ? (
          <AmountText paisa={Math.abs(snapshot.untracked)} size="xl" weight="700" color={untrackedColor} />
        ) : (
          <Icon name="chevron-forward" size={18} color={tokens.muted} />
        )}
      </Pressable>

      {/* Recent, grouped by day */}
      <SectionHeader
        title="সাম্প্রতিক লেনদেন"
        actionLabel={recent.length > 0 ? 'সব দেখুন' : undefined}
        onAction={() => router.push('/transactions')}
      />
      {recent.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="এখনো কোনো লেনদেন নেই"
          message="প্রথম খরচ বা আয় যোগ করে হিসাব শুরু করুন।"
          actionLabel="প্রথম এন্ট্রি যোগ করুন"
          onAction={() => router.push('/add')}
        />
      ) : (
        <ActivityDayList days={recentDays} />
      )}

      <PracticalBalanceSheet visible={balanceOpen} onClose={() => setBalanceOpen(false)} />
    </Screen>
  );
}

function MiniStat({ icon, label, value }: { icon: IconName; label: string; value: number }) {
  const { tokens } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.16)', borderRadius: 14, padding: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Icon name={icon} size={14} color={tokens.onFill} />
        <Text style={{ fontSize: textSize.sm, color: tokens.onFill }}>{label}</Text>
      </View>
      <AmountText paisa={value} size="lg" weight="600" color={tokens.onFill} numberOfLines={1} style={{ marginTop: 2 }} />
    </View>
  );
}

function LoanFigure({ label, amount, color }: { label: string; amount: number; color: string }) {
  const { tokens } = useTheme();
  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ fontSize: textSize.sm, color: tokens.muted }}>{label}</Text>
      <AmountText paisa={amount} weight="700" color={color} numberOfLines={1} style={{ flexShrink: 1 }} />
    </View>
  );
}
