import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { ActivitySectionList } from '@/components/activity-list';
import { MonthSwitcher, useMonthsWithData } from '@/components/month-switcher';
import { PageTitle } from '@/components/page-title';
import { ChipSelect, type ChipOption } from '@/components/ui/chip-select';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { SearchField } from '@/components/ui/search-field';
import { Text } from '@/components/ui/text';
import { textSize } from '@/constants/typography';
import { useCategorySet } from '@/hooks/use-categories';
import { useActivities } from '@/hooks/use-dashboard';
import { filterActivities, groupByDay, type ActivityType } from '@/lib/activity';
import { currentMonthKey, monthLabelBn, type MonthKey } from '@/lib/date';
import { localDigits } from '@/lib/digits';
import { formatTaka } from '@/lib/money';
import { useTheme } from '@/providers/theme-provider';

const TYPE_OPTIONS: ChipOption[] = [
  { key: 'all', label: 'সব' },
  { key: 'expense', label: 'খরচ', icon: 'arrow-up' },
  { key: 'income', label: 'আয়', icon: 'arrow-down' },
  { key: 'loan', label: 'লোন', icon: 'swap-horizontal' },
];

export default function TransactionsScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const thisMonth = currentMonthKey();
  const months = useMonthsWithData();
  const activities = useActivities();
  const expenseCategories = useCategorySet('EXPENSE');
  // "All" plus every category on offer; a deleted one drops out of the filter but its entries stay.
  const categoryOptions: ChipOption[] = useMemo(
    () => [
      { key: 'all', label: 'সব ক্যাটাগরি' },
      ...expenseCategories.options.map((c) => ({ key: c.key, label: c.label, icon: c.iconName })),
    ],
    [expenseCategories],
  );

  const [monthKey, setMonthKey] = useState<MonthKey>(thisMonth);
  const [type, setType] = useState<ActivityType>('all');
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  // A search looks through every month; otherwise the list shows the picked month.
  const searching = query.trim() !== '';

  const { count, days, income, expense } = useMemo(() => {
    const matches = filterActivities(activities, {
      type,
      category: type === 'expense' && category !== 'all' ? category : null,
      text: query,
      monthKey: searching ? null : monthKey,
    });
    const totals = { income: 0, expense: 0 };
    for (const item of matches) {
      if (item.kind === 'income') totals.income += item.amount;
      else if (item.kind === 'expense') totals.expense -= item.amount;
    }
    return { count: matches.length, days: groupByDay(matches), ...totals };
  }, [activities, type, category, query, searching, monthKey]);

  const header = (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 8, marginBottom: 16 }}>
        <View style={{ flex: 1 }}>
          <Text accessibilityRole="header" numberOfLines={1} style={{ fontSize: textSize.xl, fontWeight: '700', color: tokens.ink }}>
            লেনদেন
          </Text>
          <Text numberOfLines={1} style={{ fontSize: textSize.sm, color: tokens.muted }}>
            সব আয়, খরচ ও লোন
          </Text>
        </View>
        <MonthSwitcher value={monthKey} onChange={setMonthKey} months={months} />
      </View>

      <SearchField value={query} onChangeText={setQuery} placeholder="নাম, নোট, ক্যাটাগরি বা টাকা খুঁজুন" />

      <View style={{ gap: 8, marginTop: 12 }}>
        <ChipSelect
          scroll
          options={TYPE_OPTIONS}
          value={type}
          onChange={(key) => setType(key as ActivityType)}
          accessibilityLabel="লেনদেনের ধরন"
        />
        {type === 'expense' ? (
          <ChipSelect scroll options={categoryOptions} value={category} onChange={setCategory} accessibilityLabel="ক্যাটাগরি" />
        ) : null}
      </View>

      <Text accessibilityLiveRegion="polite" style={{ marginTop: 14, paddingHorizontal: 4, fontSize: textSize.sm, color: tokens.muted }}>
        {searching ? 'সব মাসে' : monthLabelBn(monthKey)} · {localDigits(count)}টি
        {income > 0 ? (
          <>
            {' '}
            · আয় <Text style={{ color: tokens.income, fontWeight: '600' }}>{formatTaka(income)}</Text>
          </>
        ) : null}
        {expense > 0 ? (
          <>
            {' '}
            · খরচ <Text style={{ color: tokens.expense, fontWeight: '600' }}>{formatTaka(expense)}</Text>
          </>
        ) : null}
      </Text>
    </View>
  );

  const empty = (
    <View style={{ marginTop: 14 }}>
      {searching ? (
        <EmptyState icon="search-outline" title="কিছু পাওয়া যায়নি" message="অন্য শব্দ বা টাকার অঙ্ক দিয়ে খুঁজে দেখুন।" />
      ) : type !== 'all' ? (
        <EmptyState icon="funnel-outline" title="এই ফিল্টারে কোনো লেনদেন নেই" message="অন্য ধরন বা মাস বেছে দেখুন।" />
      ) : (
        <EmptyState
          icon="receipt-outline"
          title="এই মাসে কোনো লেনদেন নেই"
          actionLabel={monthKey === thisMonth ? 'এন্ট্রি যোগ করুন' : undefined}
          onAction={monthKey === thisMonth ? () => router.push('/add') : undefined}
        />
      )}
    </View>
  );

  return (
    <Screen scroll={false} padded={false}>
      <PageTitle title="লেনদেন" />
      <ActivitySectionList days={days} header={header} empty={empty} />
    </Screen>
  );
}
