import { useRouter } from 'expo-router';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { forwardRef } from 'react';
import { Pressable, type PressableProps, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { textSize } from '@/constants/typography';
import { useStrings } from '@/lib/i18n';
import { useTheme } from '@/providers/theme-provider';

type TabButtonProps = PressableProps & {
  icon: IconName;
  activeIcon: IconName;
  label: string;
  isFocused?: boolean;
};

// Receives onPress/isFocused/style merged in from <TabTrigger asChild>.
const TabButton = forwardRef<View, TabButtonProps>(function TabButton(
  { icon, activeIcon, label, isFocused, ...pressableProps },
  ref,
) {
  const { tokens } = useTheme();
  const color = isFocused ? tokens.primary : tokens.muted;
  return (
    <Pressable
      ref={ref}
      {...pressableProps}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!isFocused }}
      style={{ flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: 6 }}>
      <Icon name={isFocused ? activeIcon : icon} size={22} color={color} />
      <Text numberOfLines={1} style={{ fontSize: textSize.xs, fontWeight: isFocused ? '700' : '500', color }}>{label}</Text>
    </Pressable>
  );
});

function Fab() {
  const { tokens } = useTheme();
  const addLabel = useStrings().tabs.addA11y;
  const router = useRouter();
  return (
    <View style={{ width: 64, alignItems: 'center' }}>
      <Pressable
        onPress={() => router.push('/add')}
        accessibilityRole="button"
        accessibilityLabel={addLabel}
        style={({ pressed }) => ({
          width: 56,
          height: 56,
          borderRadius: 18,
          marginTop: -26,
          backgroundColor: tokens.primaryFill,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: tokens.primaryFill,
          shadowOpacity: 0.45,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        })}>
        <Icon name="add" size={32} color={tokens.onFill} />
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  const { tokens } = useTheme();
  const t = useStrings().tabs;
  const insets = useSafeAreaInsets();

  return (
    <Tabs style={{ flex: 1, backgroundColor: tokens.bg }}>
      <TabSlot style={{ flex: 1 }} />
      <TabList
        accessibilityRole="tablist"
        style={{
          height: 68 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingHorizontal: 12,
          backgroundColor: tokens.surface,
          borderTopColor: tokens.line,
          borderTopWidth: 1,
          alignItems: 'center',
        }}>
        <TabTrigger name="index" href="/" asChild>
          <TabButton icon="home-outline" activeIcon="home" label={t.home} />
        </TabTrigger>
        <TabTrigger name="transactions" href="/transactions" asChild>
          <TabButton icon="receipt-outline" activeIcon="receipt" label={t.transactions} />
        </TabTrigger>
        <Fab />
        <TabTrigger name="loans" href="/loans" asChild>
          <TabButton icon="people-outline" activeIcon="people" label={t.loans} />
        </TabTrigger>
        <TabTrigger name="report" href="/report" asChild>
          <TabButton icon="bar-chart-outline" activeIcon="bar-chart" label={t.report} />
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}
