import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui/icon-button';
import { Text } from '@/components/ui/text';
import { radii, withAlpha } from '@/constants/tokens';
import { textSize } from '@/constants/typography';
import { useTheme } from '@/providers/theme-provider';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Header with a close button. Leave it out when the content brings its own header. */
  title?: string;
  children: ReactNode;
  /** Scroll the body once it is taller than the sheet (long lists, forms under the keyboard). */
  scroll?: boolean;
  gap?: number;
}

/** Sheet that slides over the screen from the bottom; tapping the dimmed backdrop closes it. */
export function BottomSheet({ visible, onClose, title, children, scroll, gap = 12 }: BottomSheetProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="বন্ধ করুন"
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
        />
        <View
          accessibilityViewIsModal
          style={{
            maxHeight: '88%',
            width: '100%',
            maxWidth: 520,
            alignSelf: 'center',
            backgroundColor: tokens.bg,
            borderTopLeftRadius: radii.xl,
            borderTopRightRadius: radii.xl,
            paddingTop: 8,
            paddingHorizontal: 18,
            paddingBottom: 16 + insets.bottom,
          }}>
          <View
            style={{
              alignSelf: 'center',
              width: 36,
              height: 4,
              borderRadius: 2,
              marginBottom: title ? 6 : 12,
              backgroundColor: withAlpha(tokens.muted, 0.35),
            }}
          />
          {title ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Text accessibilityRole="header" style={{ flex: 1, fontSize: textSize.lg, fontWeight: '700', color: tokens.ink }}>
                {title}
              </Text>
              <IconButton icon="close" label="বন্ধ করুন" variant="plain" onPress={onClose} />
            </View>
          ) : null}
          {scroll ? (
            <ScrollView
              contentContainerStyle={{ gap }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          ) : (
            <View style={{ gap }}>{children}</View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
