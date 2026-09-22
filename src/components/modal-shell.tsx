import type { ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { IconButton } from '@/components/ui/icon-button';
import { KeyboardScrollView } from '@/components/ui/keyboard-scroll-view';
import { Text } from '@/components/ui/text';
import { textSize } from '@/constants/typography';
import { useStrings } from '@/lib/i18n';
import { useTheme } from '@/providers/theme-provider';

/** Closes a modal screen; falls back to home when it was opened directly (e.g. a web refresh). */
export function useCloseModal(): () => void {
  const router = useRouter();
  return () => (router.canGoBack() ? router.back() : router.replace('/'));
}

export function ModalShell({ title, children }: { title: string; children: ReactNode }) {
  const { tokens, scheme } = useTheme();
  const closeLabel = useStrings().common.close;
  const close = useCloseModal();
  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            paddingHorizontal: 18,
            paddingVertical: 12,
          }}>
          <Text accessibilityRole="header" numberOfLines={1} style={{ flex: 1, fontSize: textSize.xl, fontWeight: '700', color: tokens.ink }}>
            {title}
          </Text>
          <IconButton icon="close" label={closeLabel} onPress={close} />
        </View>
        <KeyboardScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 4, paddingBottom: 32, gap: 16 }}>
          {children}
        </KeyboardScrollView>
      </SafeAreaView>
    </View>
  );
}
