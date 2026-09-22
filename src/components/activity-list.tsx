import { useRouter } from 'expo-router';
import { useMemo, type ReactElement } from 'react';
import { SectionList, View, type StyleProp, type ViewStyle } from 'react-native';

import { AmountText } from '@/components/ui/amount-text';
import { ListGroup, ListGroupItem, ListRow } from '@/components/ui/list-row';
import { screenListContentStyle } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { textSize } from '@/constants/typography';
import { dayLabel, type Activity, type ActivityDay } from '@/lib/activity';
import { useStrings } from '@/lib/i18n';
import { formatTaka } from '@/lib/money';
import { useTheme } from '@/providers/theme-provider';

/** A day's heading with that day's income and expense next to it. */
function DayHeader({ day, style }: { day: ActivityDay; style?: StyleProp<ViewStyle> }) {
  const { tokens } = useTheme();
  const t = useStrings().activity;
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 4 },
        style,
      ]}>
      <Text
        accessibilityRole="header"
        numberOfLines={1}
        style={{ flexShrink: 1, fontSize: textSize.sm, fontWeight: '700', color: tokens.muted }}>
        {dayLabel(day.day)}
      </Text>
      <Text numberOfLines={1} style={{ fontSize: textSize.sm, color: tokens.muted, fontVariant: ['tabular-nums'] }}>
        {day.income > 0 ? (
          <>
            {t.income} <Text style={{ color: tokens.income, fontWeight: '600' }}>{formatTaka(day.income)}</Text>
          </>
        ) : null}
        {day.income > 0 && day.expense > 0 ? ' · ' : null}
        {day.expense > 0 ? (
          <>
            {t.expense} <Text style={{ color: tokens.expense, fontWeight: '600' }}>{formatTaka(day.expense)}</Text>
          </>
        ) : null}
      </Text>
    </View>
  );
}

/** A few entries grouped by day, inside a screen that already scrolls (Home). */
export function ActivityDayList({ days }: { days: ActivityDay[] }) {
  return (
    <View style={{ gap: 16 }}>
      {days.map((d) => (
        <View key={d.day} style={{ gap: 8 }}>
          <DayHeader day={d} />
          <ListGroup>
            {d.items.map((item, idx) => (
              <ActivityRow key={item.id} item={item} divider={idx > 0} />
            ))}
          </ListGroup>
        </View>
      ))}
    </View>
  );
}

type DaySection = { key: string; day: ActivityDay; data: Activity[] };

/**
 * Every entry grouped by day as the screen's own virtualized scroller: only rows near the
 * viewport are rendered, so years of entries stay smooth on a low-end phone.
 */
export function ActivitySectionList({
  days,
  header,
  empty,
}: {
  days: ActivityDay[];
  header: ReactElement;
  empty: ReactElement;
}) {
  const sections = useMemo<DaySection[]>(() => days.map((d) => ({ key: d.day, day: d, data: d.items })), [days]);

  return (
    <SectionList<Activity, DaySection>
      sections={sections}
      keyExtractor={(item) => item.id}
      renderSectionHeader={({ section }) => <DayHeader day={section.day} style={{ marginTop: 16, marginBottom: 8 }} />}
      renderItem={({ item, index, section }) => (
        <ListGroupItem first={index === 0} last={index === section.data.length - 1}>
          <ActivityRow item={item} divider={index > 0} />
        </ListGroupItem>
      )}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      stickySectionHeadersEnabled={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={screenListContentStyle}
    />
  );
}

export function ActivityRow({ item, divider }: { item: Activity; divider?: boolean }) {
  const { tokens } = useTheme();
  const editHint = useStrings().activity.editHint;
  const router = useRouter();
  const color = item.settled
    ? tokens.muted
    : { income: tokens.income, expense: tokens.expense, lent: tokens.lent, borrowed: tokens.borrowed }[item.kind];

  const open = () => {
    if (item.kind === 'income') router.push({ pathname: '/add-income', params: { id: item.id } });
    else if (item.kind === 'expense') router.push({ pathname: '/add-expense', params: { id: item.id } });
    else router.push({ pathname: '/add-loan', params: { id: item.id } });
  };

  return (
    <ListRow
      icon={item.icon}
      tint={color}
      title={item.title}
      subtitle={item.subtitle}
      dim={item.settled}
      divider={divider}
      onPress={open}
      accessibilityLabel={`${item.title}, ${item.subtitle}, ${formatTaka(Math.abs(item.amount))}`}
      accessibilityHint={editHint}
      trailing={
        <AmountText paisa={item.amount} signed={item.kind === 'income' || item.kind === 'expense'} color={color} />
      }
    />
  );
}
