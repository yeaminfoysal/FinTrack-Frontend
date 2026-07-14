import type { ReactNode } from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '@/providers/theme-provider';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** Bottom padding to clear the floating tab bar. */
  padBottom?: number;
}

export function Screen({ children, scroll = true, contentStyle, padBottom = 108 }: ScreenProps) {
  const { tokens, scheme } = useTheme();
  const pad = { paddingHorizontal: 18, paddingTop: 8, paddingBottom: padBottom };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        {scroll ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[pad, contentStyle]}>
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, pad, contentStyle]}>{children}</View>
        )}
      </SafeAreaView>
    </View>
  );
}
