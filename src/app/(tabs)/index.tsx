import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { SyncBadge } from '@/components/sync-badge';
import { AmountText } from '@/components/ui/amount-text';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon, type IconName } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Pressable } from '@/components/ui/pressable';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import { withAlpha } from '@/constants/tokens';
import { useDashboard, type Activity } from '@/hooks/use-dashboard';
import { useSyncStatus } from '@/hooks/use-sync-status';
import { monthLabelBn, monthName, parseMonthKey } from '@/lib/date';
import { formatTaka } from '@/lib/money';
import { useTheme } from '@/providers/theme-provider';

export default function DashboardScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const { snapshot, recent, profile, monthKey } = useDashboard();
  const sync = useSyncStatus();
  const [refreshing, setRefreshing] = useState(false);

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
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 18 }}>
        <Pressable
          onPress={() => router.push('/settings')}
          accessibilityRole="button"
          accessibilityLabel={`${profile.name} — প্রোফাইল ও সেটিংস`}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={profile.name} />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ fontSize: 12.5, color: tokens.muted }}>
              আসসালামু আলাইকুম
            </Text>
            <Text numberOfLines={1} style={{ fontSize: 17, fontWeight: '700', color: tokens.ink }}>
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
          <Text style={{ fontSize: 13, fontWeight: '600', color: tokens.ink }}>
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
          <Text style={{ fontSize: 14, fontWeight: '500', color: tokens.onFill }}>বর্তমান ব্যালেন্স</Text>
          <SyncBadge onFill />
        </View>
        <AmountText
          paisa={snapshot.theoretical}
          size={38}
          weight="700"
          color={tokens.onFill}
          numberOfLines={1}
          style={{ marginTop: 6 }}
        />
        <Text style={{ fontSize: 13, color: tokens.onFill }}>
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
          <Text style={{ fontSize: 12.5, color: tokens.muted }}>মাসের শুরুতে ছিল</Text>
          <AmountText paisa={snapshot.opening} size={18} color={tokens.ink} numberOfLines={1} style={{ marginTop: 4 }} />
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={{ fontSize: 12.5, color: tokens.muted }}>এই মাসের সঞ্চয়</Text>
          <AmountText
            paisa={snapshot.saving}
            signed
            size={18}
            numberOfLines={1}
            color={snapshot.saving >= 0 ? tokens.income : tokens.expense}
            style={{ marginTop: 4 }}
          />
        </Card>
      </View>

      {/* Loans */}
      <SectionHeader title="পাওনা ও দেনা" actionLabel="সব দেখুন" onAction={() => router.push('/loans')} />
      <View style={{ flexDirection: 'row', gap: 11 }}>
        <LoanTotal
          label="পাওনা"
          caption="মানুষ আপনাকে দেবে"
          amount={snapshot.outstandingLent}
          color={tokens.lent}
          onPress={() => router.push('/loans')}
        />
        <LoanTotal
          label="দেনা"
          caption="আপনি মানুষকে দেবেন"
          amount={snapshot.outstandingBorrowed}
          color={tokens.borrowed}
          onPress={() => router.push('/loans')}
        />
      </View>
      <Card
        soft
        style={{ marginTop: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 15 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13.5, fontWeight: '600', color: tokens.ink }}>নেট ওয়ার্থ</Text>
          <Text style={{ fontSize: 12, color: tokens.muted }}>হাতে থাকা + পাওনা − দেনা</Text>
        </View>
        <AmountText paisa={snapshot.netWorth} size={17} weight="700" color={tokens.ink} />
      </Card>

      {/* Untracked */}
      <Pressable
        onPress={() => router.push('/balance')}
        accessibilityRole="button"
        accessibilityLabel={
          hasPractical ? `${untrackedLabel} ${formatTaka(Math.abs(snapshot.untracked))}` : 'বাস্তবে হাতে কত আছে লিখুন'
        }
        accessibilityHint="ব্যালেন্স পেজ খুলবে"
        style={({ pressed }) => ({
          marginTop: 14,
          borderRadius: 16,
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
          <Text style={{ fontSize: 14, fontWeight: '600', color: tokens.ink }}>
            {hasPractical ? untrackedLabel : 'হাতে কত আছে লিখুন'}
          </Text>
          <Text style={{ fontSize: 12.5, color: tokens.muted }}>
            {hasPractical
              ? untrackedIsIncome
                ? 'লেখা হয়নি এমন টাকা হাতে এসেছে'
                : 'হিসাবের বাইরে খরচ হয়ে গেছে'
              : 'তাহলে হিসাবের বাইরের খরচ ধরা পড়বে'}
          </Text>
        </View>
        {hasPractical ? (
          <AmountText paisa={Math.abs(snapshot.untracked)} size={18} weight="700" color={untrackedColor} />
        ) : (
          <Icon name="chevron-forward" size={18} color={tokens.muted} />
        )}
      </Pressable>

      {/* Recent */}
      <SectionHeader title="সাম্প্রতিক লেনদেন" actionLabel="মাসিক রিপোর্ট" onAction={() => router.push('/report')} />
      {recent.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="এখনো কোনো লেনদেন নেই"
          message="প্রথম খরচ বা আয় যোগ করে হিসাব শুরু করুন।"
          actionLabel="প্রথম এন্ট্রি যোগ করুন"
          onAction={() => router.push('/add')}
        />
      ) : (
        <View>
          {recent.map((item, idx) => (
            <View key={item.id}>
              <TransactionRow item={item} />
              {idx < recent.length - 1 ? <View style={{ height: 1, backgroundColor: tokens.line }} /> : null}
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

function MiniStat({ icon, label, value }: { icon: IconName; label: string; value: number }) {
  const { tokens } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.16)', borderRadius: 14, padding: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Icon name={icon} size={14} color={tokens.onFill} />
        <Text style={{ fontSize: 12.5, color: tokens.onFill }}>{label}</Text>
      </View>
      <AmountText paisa={value} size={16} weight="600" color={tokens.onFill} numberOfLines={1} style={{ marginTop: 2 }} />
    </View>
  );
}

function LoanTotal({
  label,
  caption,
  amount,
  color,
  onPress,
}: {
  label: string;
  caption: string;
  amount: number;
  color: string;
  onPress: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${formatTaka(amount)}`}
      accessibilityHint="লোন পেজ খুলবে"
      style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.85 : 1 })}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: color }} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: tokens.ink }}>{label}</Text>
        </View>
        <AmountText paisa={amount} size={18} color={color} numberOfLines={1} style={{ marginTop: 6 }} />
        <Text style={{ fontSize: 12, color: tokens.muted, marginTop: 2 }}>{caption}</Text>
      </Card>
    </Pressable>
  );
}

function TransactionRow({ item }: { item: Activity }) {
  const { tokens } = useTheme();
  const router = useRouter();
  const color = { income: tokens.income, expense: tokens.expense, lent: tokens.lent, borrowed: tokens.borrowed }[item.kind];
  const open = () => {
    if (item.kind === 'income') router.push({ pathname: '/add-income', params: { id: item.id } });
    else if (item.kind === 'expense') router.push({ pathname: '/add-expense', params: { id: item.id } });
    else router.push({ pathname: '/add-loan', params: { id: item.id } });
  };
  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${item.subtitle}, ${formatTaka(Math.abs(item.amount))}`}
      accessibilityHint="এডিট করতে ট্যাপ করুন"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 13,
        paddingVertical: 11,
        paddingHorizontal: 4,
        opacity: pressed ? 0.7 : 1,
      })}>
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          backgroundColor: withAlpha(color, 0.12),
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon name={item.icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '600', color: tokens.ink }}>
          {item.title}
        </Text>
        <Text numberOfLines={1} style={{ fontSize: 12.5, color: tokens.muted }}>
          {item.subtitle}
        </Text>
      </View>
      <AmountText
        paisa={item.amount}
        signed={item.kind === 'income' || item.kind === 'expense'}
        size={14.5}
        color={color}
      />
    </Pressable>
  );
}
