/**
 * "আজকের খরচ" on Home: what today has cost so far, the week behind it, and how today
 * compares with the days before it. Month totals alone hide the day you are living in.
 */
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { DaySpendBars } from '@/components/charts';
import { AmountText } from '@/components/ui/amount-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { radii, withAlpha } from '@/constants/tokens';
import { textSize } from '@/constants/typography';
import { recentDaySpends } from '@/lib/calc';
import { todayKey } from '@/lib/date';
import { localDigits } from '@/lib/digits';
import { useStrings } from '@/lib/i18n';
import { formatTaka } from '@/lib/money';
import { useTheme } from '@/providers/theme-provider';
import { useDataStore } from '@/stores/data';

/** Today plus the six days before it — a week is long enough to show a habit, short enough to read. */
const SPEND_DAYS = 7;

export function TodaySpendCard({ onPress }: { onPress: () => void }) {
  const { tokens } = useTheme();
  const t = useStrings().todaySpend;
  const expenses = useDataStore((s) => s.expenses);
  const days = useMemo(() => recentDaySpends(expenses, todayKey(), SPEND_DAYS), [expenses]);

  const today = days[days.length - 1].total;
  const earlier = days.slice(0, -1);
  // The days before today set the bar; today is the one being judged, so it stays out of
  // its own average. A day with nothing spent counts — spending nothing is a real day.
  const average = Math.round(earlier.reduce((sum, d) => sum + d.total, 0) / earlier.length);
  const comparison = average > 0 && today > 0 ? Math.round(((today - average) / average) * 100) : null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t.a11y(formatTaka(today))}
      accessibilityHint={t.openHint}
      style={({ pressed }) => ({
        marginTop: 11,
        borderRadius: radii.lg,
        padding: 15,
        gap: 13,
        backgroundColor: tokens.surface,
        borderColor: tokens.line,
        borderWidth: 1,
        opacity: pressed ? 0.85 : 1,
      })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: withAlpha(today > 0 ? tokens.expense : tokens.primary, 0.12),
          }}>
          <Icon name="today-outline" size={22} color={today > 0 ? tokens.expense : tokens.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: textSize.md, fontWeight: '600', color: tokens.ink }}>{t.title}</Text>
          <Text numberOfLines={1} style={{ fontSize: textSize.sm, color: tokens.muted }}>
            {today > 0
              ? average > 0
                ? t.average(formatTaka(average))
                : t.firstDay
              : t.nothingYet}
          </Text>
        </View>
        <AmountText
          paisa={today}
          size="xl"
          weight="700"
          color={today > 0 ? tokens.expense : tokens.muted}
          numberOfLines={1}
        />
      </View>

      <DaySpendBars days={days} />

      {comparison !== null && comparison !== 0 ? (
        <Trend percent={comparison} />
      ) : null}
    </Pressable>
  );
}

/** "গড়ের চেয়ে ২০% বেশি" — spending less than usual is the good direction, so it reads green. */
function Trend({ percent }: { percent: number }) {
  const { tokens } = useTheme();
  const t = useStrings().todaySpend;
  const more = percent > 0;
  const color = more ? tokens.expense : tokens.income;
  const icon: IconName = more ? 'trending-up' : 'trending-down';

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Icon name={icon} size={15} color={color} />
      <Text style={{ fontSize: textSize.sm, color: tokens.muted }}>
        {t.trendPrefix}
        <Text style={{ fontWeight: '700', color }}>{t.trendValue(localDigits(Math.abs(percent)), more)}</Text>
        {t.trendSuffix}
      </Text>
    </View>
  );
}
