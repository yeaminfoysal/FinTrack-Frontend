/** Small charts drawn with plain Views — no chart library, same idea as the bars in the PDF report. */
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { withAlpha } from '@/constants/tokens';
import { textSize } from '@/constants/typography';
import type { CategoryTotal } from '@/lib/calc';
import { monthLabelBn, monthShortBn, type MonthKey } from '@/lib/date';
import { localDigits } from '@/lib/digits';
import { useCategorySet } from '@/hooks/use-categories';
import { formatTaka } from '@/lib/money';
import { useTheme } from '@/providers/theme-provider';

/** One bar per category with its share of the month's expense. `items` come largest first. */
export function CategoryBars({ items }: { items: CategoryTotal[] }) {
  const { tokens } = useTheme();
  const categories = useCategorySet('EXPENSE');
  const total = items.reduce((sum, c) => sum + c.amount, 0);

  return (
    <View style={{ gap: 14 }}>
      {items.map(({ category, amount }) => {
        const meta = categories.meta(category);
        const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
        return (
          <View
            key={category}
            accessible
            accessibilityLabel={`${meta.label} ${formatTaka(amount)}, ${localDigits(pct)}%`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 11,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: withAlpha(tokens.expense, 0.12),
              }}>
              <Icon name={meta.iconName} size={18} color={tokens.expense} />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text numberOfLines={1} style={{ flex: 1, fontSize: textSize.md, fontWeight: '600', color: tokens.ink }}>
                  {meta.label}
                </Text>
                <Text style={{ fontSize: textSize.xs, color: tokens.muted, fontVariant: ['tabular-nums'] }}>
                  {localDigits(pct)}%
                </Text>
                <Text style={{ fontSize: textSize.md, fontWeight: '600', color: tokens.ink, fontVariant: ['tabular-nums'] }}>
                  {formatTaka(amount)}
                </Text>
              </View>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: tokens.chip, overflow: 'hidden' }}>
                <View style={{ width: `${Math.max(pct, 2)}%`, height: '100%', borderRadius: 4, backgroundColor: tokens.expense }} />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export interface MonthSaving {
  key: MonthKey;
  saving: number;
}

const CHART_HEIGHT = 120;

/** Column per month; a month that lost money hangs below the zero line. Tapping a column selects that month. */
export function SavingBars({
  months,
  selected,
  onSelect,
}: {
  months: MonthSaving[];
  selected: MonthKey;
  onSelect?: (key: MonthKey) => void;
}) {
  const { tokens } = useTheme();
  const maxUp = Math.max(0, ...months.map((m) => m.saving));
  const maxDown = Math.max(0, ...months.map((m) => -m.saving));
  const range = maxUp + maxDown;
  // The zero line sits where it splits the tallest gain from the deepest loss.
  const upHeight = range > 0 ? Math.round((CHART_HEIGHT * maxUp) / range) : CHART_HEIGHT;
  const barHeight = (value: number) =>
    range > 0 && value !== 0 ? Math.max(3, Math.round((CHART_HEIGHT * Math.abs(value)) / range)) : 0;

  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {months.map((m) => {
        const isSelected = m.key === selected;
        const color = m.saving < 0 ? tokens.expense : tokens.income;
        const bar = {
          width: '62%',
          maxWidth: 30,
          height: barHeight(m.saving),
          backgroundColor: isSelected ? color : withAlpha(color, 0.4),
        } as const;
        return (
          <Pressable
            key={m.key}
            onPress={onSelect ? () => onSelect(m.key) : undefined}
            disabled={!onSelect}
            accessibilityRole="button"
            accessibilityLabel={`${monthLabelBn(m.key)}, সঞ্চয় ${formatTaka(m.saving)}`}
            accessibilityState={{ selected: isSelected }}
            style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ height: upHeight, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'flex-end' }}>
              {m.saving > 0 ? <View style={[bar, { borderTopLeftRadius: 6, borderTopRightRadius: 6 }]} /> : null}
            </View>
            <View style={{ height: 1, alignSelf: 'stretch', backgroundColor: tokens.line }} />
            <View style={{ height: CHART_HEIGHT - upHeight, alignSelf: 'stretch', alignItems: 'center' }}>
              {m.saving < 0 ? <View style={[bar, { borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }]} /> : null}
            </View>
            <Text
              numberOfLines={1}
              style={{
                marginTop: 6,
                fontSize: textSize.xs,
                fontWeight: isSelected ? '700' : '400',
                color: isSelected ? tokens.ink : tokens.muted,
              }}>
              {monthShortBn(m.key)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
