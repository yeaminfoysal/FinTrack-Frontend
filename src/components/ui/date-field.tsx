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
  dayKeyToIso,
  dayMonth,
  daysInMonth,
  fullDate,
  monthLabel,
  nextMonthKey,
  parseMonthKey,
  prevMonthKey,
  shiftDayKey,
  todayKey,
  weekday,
  weekdayNamesShort,
  type DayKey,
  type MonthKey,
} from '@/lib/date';
import { localDigits } from '@/lib/digits';
import { useStrings } from '@/lib/i18n';
import { useTheme } from '@/providers/theme-provider';

interface DateFieldProps {
  value: DayKey;
  onChange: (day: DayKey) => void;
  label?: string;
}

/** Picks a day: "আজ" / "গতকাল" shortcuts plus a calendar. Days after today can't be chosen. */
export function DateField({ value, onChange, label }: DateFieldProps) {
  const { tokens } = useTheme();
  const s = useStrings();
  const t = s.ui;
  const fieldLabel = label ?? t.dateLabel;
  const [calendarOpen, setCalendarOpen] = useState(false);
  const today = todayKey();
  const yesterday = shiftDayKey(today, -1);
  const otherDay = value !== today && value !== yesterday;
  const iso = dayKeyToIso(value);

  return (
    <View style={{ gap: 7 }}>
      <Text style={{ fontSize: textSize.sm, fontWeight: '600', color: tokens.muted, marginLeft: 2 }}>{fieldLabel}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={fieldLabel} style={{ flexDirection: 'row', gap: 8 }}>
        <DayChip label={s.common.today} selected={value === today} onPress={() => onChange(today)} />
        <DayChip label={s.common.yesterday} selected={value === yesterday} onPress={() => onChange(yesterday)} />
        <DayChip
          label={otherDay ? dayMonth(iso) : t.otherDay}
          icon="calendar-outline"
          selected={otherDay}
          hint={t.openCalendar}
          onPress={() => setCalendarOpen(true)}
        />
      </View>
      <Text style={{ fontSize: textSize.sm, color: tokens.muted, marginLeft: 2 }}>
        {fullDate(iso)} · {weekday(iso)}
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
  /** Latest day that can be picked; leave it out to allow future days (a loan's due date). */
  maxDay?: DayKey;
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

  const t = useStrings();
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
        <IconButton icon="chevron-back" label={t.ui.prevMonth} onPress={() => setMonth(prevMonthKey(month))} />
        <Text accessibilityRole="header" style={{ fontSize: textSize.lg, fontWeight: '700', color: tokens.ink }}>
          {monthLabel(month)}
        </Text>
        <IconButton
          icon="chevron-forward"
          label={t.ui.nextMonth}
          disabled={maxDay != null && month >= maxDay.slice(0, 7)}
          onPress={() => setMonth(nextMonthKey(month))}
        />
      </View>
      <View style={{ flexDirection: 'row' }}>
        {weekdayNamesShort().map((name) => (
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
            const disabled = maxDay != null && day > maxDay;
            const selected = day === value;
            const isToday = day === todayKey();
            return (
              <Pressable
                key={i}
                onPress={() => onSelect(day)}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={fullDate(dayKeyToIso(day))}
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
      <Button label={t.common.cancel} variant="secondary" onPress={onClose} style={{ marginTop: 4 }} />
    </BottomSheet>
  );
}

/**
 * Optional day in the future — a loan's expected return date. Unlike DateField the
 * calendar has no upper bound and "নেই" clears it, because most loans have no fixed date.
 */
export function DueDateField({
  value,
  onChange,
  label,
  hint,
}: {
  value: DayKey | null;
  onChange: (day: DayKey | null) => void;
  label?: string;
  hint?: string;
}) {
  const { tokens } = useTheme();
  const t = useStrings().ui;
  const fieldLabel = label ?? t.dueDateLabel;
  const [calendarOpen, setCalendarOpen] = useState(false);
  const today = todayKey();
  const inAMonth = shiftDayKey(today, 30);
  const picked = value != null && value !== inAMonth;

  return (
    <View style={{ gap: 7 }}>
      <Text style={{ fontSize: textSize.sm, fontWeight: '600', color: tokens.muted, marginLeft: 2 }}>{fieldLabel}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={fieldLabel} style={{ flexDirection: 'row', gap: 8 }}>
        <DayChip label={t.noDate} selected={value == null} onPress={() => onChange(null)} />
        <DayChip label={t.inOneMonth} selected={value === inAMonth} onPress={() => onChange(inAMonth)} />
        <DayChip
          label={picked ? dayMonth(dayKeyToIso(value)) : t.pickDate}
          icon="calendar-outline"
          selected={picked}
          hint={t.openCalendar}
          onPress={() => setCalendarOpen(true)}
        />
      </View>
      <Text style={{ fontSize: textSize.sm, lineHeight: 18, color: tokens.muted, marginLeft: 2 }}>
        {value ? `${fullDate(dayKeyToIso(value))} · ${weekday(dayKeyToIso(value))}` : (hint ?? t.dueDateHint)}
      </Text>
      <CalendarSheet
        visible={calendarOpen}
        value={value ?? today}
        onClose={() => setCalendarOpen(false)}
        onSelect={(day) => {
          onChange(day);
          setCalendarOpen(false);
        }}
      />
    </View>
  );
}
