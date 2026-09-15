import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '@/providers/theme-provider';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** Bottom padding to clear the floating tab bar. */
  padBottom?: number;
  /** Pull-to-refresh (native only; web ignores it). */
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function Screen({ children, scroll = true, contentStyle, padBottom = 108, refreshing, onRefresh }: ScreenProps) {
  const { tokens, scheme } = useTheme();
  const pad = { paddingHorizontal: 18, paddingTop: 8, paddingBottom: padBottom };

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
