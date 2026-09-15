import { useMemo, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { ListGroup, ListRow } from '@/components/ui/list-row';
import { Text } from '@/components/ui/text';
import { textSize } from '@/constants/typography';
import { monthDailyExpense, monthIncome } from '@/lib/calc';
import {
  currentMonthKey,
  monthKeyOf,
  monthLabelBn,
  monthName,
  nextMonthKey,
  parseMonthKey,
  prevMonthKey,
  type MonthKey,
} from '@/lib/date';
import { formatTaka } from '@/lib/money';
import { useTheme } from '@/providers/theme-provider';
import { useDataStore } from '@/stores/data';

/** Months with any income, expense, loan or closed summary, plus the current month — newest first. */
export function useMonthsWithData(): MonthKey[] {
  const incomes = useDataStore((s) => s.incomes);
  const expenses = useDataStore((s) => s.expenses);
  const loans = useDataStore((s) => s.loans);
  const summaries = useDataStore((s) => s.summaries);
  const current = currentMonthKey();

  return useMemo(() => {
    const keys = new Set<MonthKey>([current]);
    for (const r of [...incomes, ...expenses, ...loans]) if (!r.isDeleted) keys.add(monthKeyOf(new Date(r.date)));
    for (const s of summaries) if (!s.isDeleted) keys.add(`${s.year}-${String(s.month).padStart(2, '0')}`);
    return [...keys].sort().reverse();
  }, [current, incomes, expenses, loans, summaries]);
}

interface MonthSwitcherProps {
  value: MonthKey;
  onChange: (key: MonthKey) => void;
  /** Months that can be picked, newest first (useMonthsWithData). */
  months: MonthKey[];
}

/** "‹ সেপ্টেম্বর 2026 ›" pill; the label opens a sheet with every month. */
export function MonthSwitcher({ value, onChange, months }: MonthSwitcherProps) {
  const { tokens } = useTheme();
  const [pickerOpen, setPickerOpen] = useState(false);
  // On narrow phones the year is dropped for this year's months so the screen title keeps its room.
  const compact = useWindowDimensions().width < 400;
  const sameYear = value.slice(0, 4) === currentMonthKey().slice(0, 4);
  const label = compact && sameYear ? monthName(parseMonthKey(value).month) : monthLabelBn(value);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: tokens.surface,
        borderColor: tokens.line,
        borderWidth: 1,
        borderRadius: 999,
      }}>
      <IconButton
        icon="chevron-back"
        label="আগের মাস"
        variant="plain"
        size={36}
        iconSize={18}
        disabled={value <= months[months.length - 1]}
        onPress={() => onChange(prevMonthKey(value))}
      />
      <Pressable
        onPress={() => setPickerOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${monthLabelBn(value)} — মাস বাছাই করুন`}
        hitSlop={6}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8 }}>
        <Text numberOfLines={1} style={{ fontSize: textSize.sm, fontWeight: '600', color: tokens.ink }}>
          {label}
        </Text>
        <Icon name="chevron-down" size={14} color={tokens.muted} />
      </Pressable>
      <IconButton
        icon="chevron-forward"
        label="পরের মাস"
        variant="plain"
        size={36}
        iconSize={18}
        disabled={value >= months[0]}
        onPress={() => onChange(nextMonthKey(value))}
      />
      <BottomSheet visible={pickerOpen} onClose={() => setPickerOpen(false)} title="মাস বাছাই করুন" scroll>
        <MonthList
          months={months}
          value={value}
          onSelect={(key) => {
            onChange(key);
            setPickerOpen(false);
          }}
        />
      </BottomSheet>
    </View>
  );
}

/** Its own component so the per-month totals are only worked out while the sheet is open. */
function MonthList({ months, value, onSelect }: { months: MonthKey[]; value: MonthKey; onSelect: (key: MonthKey) => void }) {
  const { tokens } = useTheme();
  const incomes = useDataStore((s) => s.incomes);
  const expenses = useDataStore((s) => s.expenses);
  const current = currentMonthKey();

  return (
    <ListGroup>
      {months.map((key, idx) => (
        <ListRow
          key={key}
          divider={idx > 0}
          title={`${monthLabelBn(key)}${key === current ? ' · চলতি' : ''}`}
          subtitle={
            <>
              আয় <Text style={{ color: tokens.income }}>{formatTaka(monthIncome(incomes, key))}</Text> · খরচ{' '}
              <Text style={{ color: tokens.expense }}>{formatTaka(monthDailyExpense(expenses, key))}</Text>
            </>
          }
          selected={key === value}
          onPress={() => onSelect(key)}
        />
      ))}
    </ListGroup>
  );
}
