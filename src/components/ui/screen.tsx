import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '@/providers/theme-provider';

/** Side gutter of every screen. */
export const SCREEN_GUTTER = 18;
/** Room under the content so the last row clears the floating tab bar. */
export const TAB_BAR_CLEARANCE = 108;
/** Content padding for a FlatList/SectionList that scrolls a whole `<Screen scroll={false} padded={false}>`. */
export const screenListContentStyle: ViewStyle = {
  paddingHorizontal: SCREEN_GUTTER,
  paddingTop: 8,
  paddingBottom: TAB_BAR_CLEARANCE,
};

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** Bottom padding to clear the floating tab bar. */
  padBottom?: number;
  /** Set false when a virtualized list is the scroller and pads its own content. */
  padded?: boolean;
  /** Pull-to-refresh (native only; web ignores it). */
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function Screen({
  children,
  scroll = true,
  contentStyle,
  padBottom = TAB_BAR_CLEARANCE,
  padded = true,
  refreshing,
  onRefresh,
}: ScreenProps) {
  const { tokens, scheme } = useTheme();
  const pad = padded ? { paddingHorizontal: SCREEN_GUTTER, paddingTop: 8, paddingBottom: padBottom } : null;

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        {scroll ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[pad, contentStyle]}
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={!!refreshing}
                  onRefresh={onRefresh}
                  tintColor={tokens.primary}
                  colors={[tokens.primaryFill]}
                  progressBackgroundColor={tokens.surface}
                />
              ) : undefined
            }>
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, pad, contentStyle]}>{children}</View>
        )}
      </SafeAreaView>
    </View>
  );
}
