import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Text } from '@/components/ui/text';
import { withAlpha } from '@/constants/tokens';
import { textSize } from '@/constants/typography';
import {
  BN_WEEKDAYS_SHORT,
  dayKeyToIso,
  dayMonthBn,
  daysInMonth,
  fullDateBn,
  monthLabelBn,
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
import { useTheme } from '@/providers/theme-provider';

interface DateFieldProps {
  value: DayKey;
  onChange: (day: DayKey) => void;
  label?: string;
}

/** Picks a day: "আজ" / "গতকাল" shortcuts plus a calendar. Days after today can't be chosen. */
export function DateField({ value, onChange, label = 'তারিখ' }: DateFieldProps) {
  const { tokens } = useTheme();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const today = todayKey();
  const yesterday = shiftDayKey(today, -1);
  const otherDay = value !== today && value !== yesterday;
  const iso = dayKeyToIso(value);

  return (
    <View style={{ gap: 7 }}>
      <Text style={{ fontSize: textSize.sm, fontWeight: '600', color: tokens.muted, marginLeft: 2 }}>{label}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', gap: 8 }}>
        <DayChip label="আজ" selected={value === today} onPress={() => onChange(today)} />
        <DayChip label="গতকাল" selected={value === yesterday} onPress={() => onChange(yesterday)} />
        <DayChip
          label={otherDay ? dayMonthBn(iso) : 'অন্য দিন'}
          icon="calendar-outline"
          selected={otherDay}
          hint="ক্যালেন্ডার খুলবে"
          onPress={() => setCalendarOpen(true)}
        />
      </View>
      <Text style={{ fontSize: textSize.sm, color: tokens.muted, marginLeft: 2 }}>
        {fullDateBn(iso)} · {weekdayBn(iso)}
      </Text>
      <CalendarSheet
        visible={calendarOpen}
        value={value}
        maxDay={today}
        onClose={() => setCalendarOpen(false)}
        onSelect={(day) => {
          onChange(day);
          setCalendarOpen(false);
        }}
      />
    </View>
  );
}

function DayChip({
  label,
  icon,
  selected,
  hint,
  onPress,
}: {
  label: string;
  icon?: IconName;
  selected: boolean;
  hint?: string;
  onPress: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: selected ? tokens.primary : tokens.line,
        backgroundColor: selected ? withAlpha(tokens.primary, 0.12) : tokens.surface,
        opacity: pressed ? 0.8 : 1,
      })}>
      {icon ? <Icon name={icon} size={16} color={selected ? tokens.primary : tokens.muted} /> : null}
      <Text numberOfLines={1} style={{ fontSize: textSize.md, fontWeight: '600', color: selected ? tokens.primary : tokens.ink }}>
        {label}
      </Text>
    </Pressable>
  );
}

const pad2 = (n: number) => String(n).padStart(2, '0');

function CalendarSheet({
  visible,
  value,
  maxDay,
  onClose,
  onSelect,
}: {
  visible: boolean;
  value: DayKey;
  maxDay: DayKey;
  onClose: () => void;
  onSelect: (day: DayKey) => void;
}) {
  const { tokens } = useTheme();
  const [month, setMonth] = useState<MonthKey>(value.slice(0, 7));
  // Each time the sheet opens, start at the month of the selected day.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setMonth(value.slice(0, 7));
  }

  const { year, month: monthNumber } = parseMonthKey(month);
  const lead = new Date(year, monthNumber - 1, 1).getDay();
  const cells: (number | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth(month) }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));

  return (
    <BottomSheet visible={visible} onClose={onClose} gap={8}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton icon="chevron-back" label="আগের মাস" onPress={() => setMonth(prevMonthKey(month))} />
        <Text accessibilityRole="header" style={{ fontSize: textSize.lg, fontWeight: '700', color: tokens.ink }}>
          {monthLabelBn(month)}
        </Text>
        <IconButton
          icon="chevron-forward"
          label="পরের মাস"
          disabled={month >= maxDay.slice(0, 7)}
          onPress={() => setMonth(nextMonthKey(month))}
        />
      </View>
      <View style={{ flexDirection: 'row' }}>
        {BN_WEEKDAYS_SHORT.map((name) => (
          <Text key={name} style={{ flex: 1, textAlign: 'center', fontSize: textSize.xs, fontWeight: '600', color: tokens.muted }}>
            {name}
          </Text>
        ))}
      </View>
      {weeks.map((week, w) => (
        <View key={w} style={{ flexDirection: 'row' }}>
          {week.map((dayNumber, i) => {
            if (dayNumber == null) return <View key={i} style={{ flex: 1, height: 44 }} />;
            const day = `${month}-${pad2(dayNumber)}`;
            const disabled = day > maxDay;
            const selected = day === value;
            const isToday = day === maxDay;
            return (
              <Pressable
                key={i}
                onPress={() => onSelect(day)}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={fullDateBn(dayKeyToIso(day))}
                accessibilityState={{ selected, disabled }}
                style={{ flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: selected ? tokens.primaryFill : 'transparent',
                    borderWidth: isToday && !selected ? 1 : 0,
                    borderColor: tokens.primary,
                  }}>
                  <Text
                    style={{
                      fontSize: textSize.md,
                      fontWeight: selected || isToday ? '700' : '400',
                      color: selected ? tokens.onFill : disabled ? tokens.muted : tokens.ink,
                      opacity: disabled ? 0.45 : 1,
                    }}>
                    {localDigits(dayNumber)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
      <Button label="বাতিল" variant="secondary" onPress={onClose} style={{ marginTop: 4 }} />
    </BottomSheet>
  );
}
