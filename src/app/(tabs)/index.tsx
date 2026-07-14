import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { AmountText } from '@/components/ui/amount-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { withAlpha } from '@/constants/tokens';
import { useDashboard, type Activity } from '@/hooks/use-dashboard';
import { formatTaka } from '@/lib/money';
import { monthLabelBn } from '@/lib/date';
import { useTheme } from '@/providers/theme-provider';

export default function DashboardScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const { snapshot, recent, profile, monthKey } = useDashboard();

  const untrackedIsIncome = snapshot.untracked < 0;
  const untrackedAbs = Math.abs(snapshot.untracked);

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
        <Pressable
          onPress={() => router.push('/settings')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              backgroundColor: tokens.surface2,
              borderColor: tokens.line,
              borderWidth: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={{ fontWeight: '700', color: tokens.primary, fontSize: 16 }}>
              {profile.name.slice(0, 2)}
            </Text>
          </View>
          <View>
            <Text style={{ fontSize: 12, color: tokens.muted }}>আসসালামু আলাইকুম</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: tokens.ink }}>{profile.name}</Text>
          </View>
        </Pressable>
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
          <Text style={{ fontSize: 12.5, fontWeight: '600', color: tokens.ink }}>
            {monthLabelBn(monthKey)}
          </Text>
        </View>
      </View>

      {/* Balance card */}
      <View
        style={{
          borderRadius: 24,
          padding: 22,
          backgroundColor: tokens.primary,
          overflow: 'hidden',
          shadowColor: tokens.primary,
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
            backgroundColor: 'rgba(255,255,255,0.08)',
          }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 12.5, color: tokens.onPrimary, opacity: 0.85 }}>
            বর্তমান ব্যালেন্স <Text style={{ opacity: 0.7 }}>(Theoretical)</Text>
          </Text>
          <Text
            style={{
              fontSize: 11,
              color: tokens.onPrimary,
              backgroundColor: 'rgba(255,255,255,0.18)',
              paddingVertical: 3,
              paddingHorizontal: 9,
              borderRadius: 999,
              overflow: 'hidden',
            }}>
            Synced ✓
          </Text>
        </View>
        <AmountText
          paisa={snapshot.theoretical}
          size={38}
          weight="700"
          color={tokens.onPrimary}
          style={{ marginTop: 8, marginBottom: 2 }}
        />
        <Text style={{ fontSize: 12, color: tokens.onPrimary, opacity: 0.82 }}>
          প্র্যাকটিক্যাল হাতে আছে{' '}
          <Text style={{ fontWeight: '600' }}>
            {snapshot.practical == null ? '—' : formatTaka(snapshot.practical)}
          </Text>
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <MiniStat label="↓ আয়" value={snapshot.monthIncome} tokens={tokens} />
          <MiniStat label="↑ খরচ" value={snapshot.monthDailyExpense} tokens={tokens} />
        </View>
      </View>

      {/* Opening + saving */}
      <View style={{ flexDirection: 'row', gap: 11, marginTop: 14 }}>
        <Card style={{ flex: 1 }}>
          <Text style={{ fontSize: 11.5, color: tokens.muted }}>ওপেনিং সেভিংস</Text>
          <AmountText paisa={snapshot.opening} size={18} color={tokens.ink} style={{ marginTop: 4 }} />
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={{ fontSize: 11.5, color: tokens.muted }}>এই মাসের সঞ্চয়</Text>
          <AmountText
            paisa={snapshot.saving}
            signed
            size={18}
            color={snapshot.saving >= 0 ? tokens.income : tokens.expense}
            style={{ marginTop: 4 }}
          />
        </Card>
      </View>

      {/* Loans */}
      <SectionHeader title="পাওনা ও দেনা" actionLabel="সব দেখুন →" onAction={() => router.push('/loans')} />
      <View style={{ flexDirection: 'row', gap: 11 }}>
        <Pressable style={{ flex: 1 }} onPress={() => router.push('/loans')}>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: tokens.lent }} />
              <Text style={{ fontSize: 11.5, color: tokens.muted }}>পাওনা (Lent)</Text>
            </View>
            <AmountText paisa={snapshot.outstandingLent} size={18} color={tokens.lent} style={{ marginTop: 6 }} />
          </Card>
        </Pressable>
        <Pressable style={{ flex: 1 }} onPress={() => router.push('/loans')}>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: tokens.borrowed }} />
              <Text style={{ fontSize: 11.5, color: tokens.muted }}>দেনা (Borrowed)</Text>
            </View>
            <AmountText paisa={snapshot.outstandingBorrowed} size={18} color={tokens.borrowed} style={{ marginTop: 6 }} />
          </Card>
        </Pressable>
      </View>
      <Card soft style={{ marginTop: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15 }}>
        <Text style={{ fontSize: 12.5, color: tokens.muted }}>নেট ওয়ার্থ</Text>
        <AmountText paisa={snapshot.netWorth} size={16} weight="700" color={tokens.ink} />
      </Card>

      {/* Untracked */}
      <Pressable onPress={() => router.push('/balance')}>
        <View
          style={{
            marginTop: 14,
            borderRadius: 16,
            padding: 15,
            backgroundColor: tokens.surface,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: untrackedIsIncome ? tokens.income : tokens.borrowed,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 13,
          }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              backgroundColor: withAlpha(untrackedIsIncome ? tokens.income : tokens.borrowed, 0.12),
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={{ color: untrackedIsIncome ? tokens.income : tokens.borrowed, fontSize: 18 }}>?</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: tokens.ink }}>
              {untrackedIsIncome ? 'আনট্র্যাকড আয়' : 'আনট্র্যাকড খরচ'}
            </Text>
            <Text style={{ fontSize: 11.5, color: tokens.muted }}>
              {snapshot.practical == null ? 'ব্যালেন্স ইনপুট দিন' : 'হিসাবের বাইরে চলে গেছে'}
            </Text>
          </View>
          <AmountText paisa={untrackedAbs} size={18} weight="700" color={untrackedIsIncome ? tokens.income : tokens.borrowed} />
        </View>
      </Pressable>

      {/* Recent */}
      <SectionHeader title="সাম্প্রতিক লেনদেন" actionLabel="সব →" onAction={() => router.push('/report')} />
      <View>
        {recent.length === 0 ? (
          <Text style={{ color: tokens.muted, fontSize: 13, paddingHorizontal: 4 }}>এখনো কোনো লেনদেন নেই।</Text>
        ) : (
          recent.map((item, idx) => (
            <View key={item.id}>
              <TransactionRow item={item} />
              {idx < recent.length - 1 ? (
                <View style={{ height: 1, backgroundColor: tokens.line }} />
              ) : null}
            </View>
          ))
        )}
      </View>
    </Screen>
  );
}

function MiniStat({ label, value, tokens }: { label: string; value: number; tokens: ReturnType<typeof useTheme>['tokens'] }) {
  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 14, padding: 12 }}>
      <Text style={{ fontSize: 11, color: tokens.onPrimary, opacity: 0.82 }}>{label}</Text>
      <AmountText paisa={value} size={16} weight="600" color={tokens.onPrimary} style={{ marginTop: 2 }} />
    </View>
  );
}

function TransactionRow({ item }: { item: Activity }) {
  const { tokens } = useTheme();
  const color =
    item.kind === 'income'
      ? tokens.income
      : item.kind === 'expense'
        ? tokens.expense
        : item.kind === 'lent'
          ? tokens.lent
          : tokens.borrowed;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 11, paddingHorizontal: 4 }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: withAlpha(color, 0.12),
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Text style={{ color, fontSize: 17 }}>{item.icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13.5, fontWeight: '600', color: tokens.ink }} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={{ fontSize: 11.5, color: tokens.muted }}>{item.subtitle}</Text>
      </View>
      <AmountText
        paisa={item.amount}
        signed={item.kind === 'income' || item.kind === 'expense'}
        size={14}
        color={color}
      />
    </View>
  );
}
