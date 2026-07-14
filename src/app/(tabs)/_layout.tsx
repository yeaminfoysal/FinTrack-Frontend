import { useRouter } from 'expo-router';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { forwardRef } from 'react';
import { Pressable, Text, View, type PressableProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/providers/theme-provider';

type TabButtonProps = PressableProps & {
  glyph: string;
  label: string;
  isFocused?: boolean;
};

// Receives onPress/isFocused/style merged in from <TabTrigger asChild>.
const TabButton = forwardRef<View, TabButtonProps>(function TabButton(
  { glyph, label, isFocused, ...pressableProps },
  ref,
) {
  const { tokens } = useTheme();
  const color = isFocused ? tokens.primary : tokens.muted;
  return (
    <Pressable
      ref={ref}
      {...pressableProps}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 6 }}>
      <Text style={{ fontSize: 19, color }}>{glyph}</Text>
      <Text style={{ fontSize: 10, fontWeight: '600', color }}>{label}</Text>
    </Pressable>
  );
});

function Fab() {
  const { tokens } = useTheme();
  const router = useRouter();
  return (
    <View style={{ width: 60, alignItems: 'center' }}>
      <Pressable
        onPress={() => router.push('/add')}
        style={{
          width: 54,
          height: 54,
          borderRadius: 17,
          marginTop: -26,
          backgroundColor: tokens.primary,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: tokens.primary,
          shadowOpacity: 0.5,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        }}>
        <Text style={{ color: '#fff', fontSize: 30, fontWeight: '300', lineHeight: 34 }}>+</Text>
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs style={{ flex: 1, backgroundColor: tokens.bg }}>
      <TabSlot style={{ flex: 1 }} />
      <TabList
        style={{
          height: 66 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingHorizontal: 14,
          backgroundColor: tokens.surface,
          borderTopColor: tokens.line,
          borderTopWidth: 1,
          alignItems: 'center',
        }}>
        <TabTrigger name="index" href="/" asChild>
          <TabButton glyph="⌂" label="হোম" />
        </TabTrigger>
        <TabTrigger name="loans" href="/loans" asChild>
          <TabButton glyph="⇄" label="লোন" />
        </TabTrigger>
        <Fab />
        <TabTrigger name="balance" href="/balance" asChild>
          <TabButton glyph="◉" label="ব্যালেন্স" />
        </TabTrigger>
        <TabTrigger name="report" href="/report" asChild>
          <TabButton glyph="▤" label="রিপোর্ট" />
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}
