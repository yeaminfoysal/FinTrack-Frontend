import type { ReactNode } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { APP_MAX_WIDTH } from '@/components/ui/app-frame';
import { useKeyboardOverlap } from '@/hooks/use-keyboard-overlap';
import { IconButton } from '@/components/ui/icon-button';
import { Text } from '@/components/ui/text';
import { radii, withAlpha } from '@/constants/tokens';
import { textSize } from '@/constants/typography';
import { useStrings } from '@/lib/i18n';
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
  const closeLabel = useStrings().common.close;
  const insets = useSafeAreaInsets();
  // The sheet sits on the bottom edge, so the keyboard covers it completely unless it is
  // lifted by however much the keyboard actually takes (see useKeyboardOverlap).
  const keyboard = useKeyboardOverlap();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: keyboard }}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
        />
        <View
          accessibilityViewIsModal
          style={{
            maxHeight: '88%',
            width: '100%',
            // The sheet is a viewport-wide overlay on web; keep it inside the app column.
            maxWidth: Platform.OS === 'web' ? APP_MAX_WIDTH : 520,
            alignSelf: 'center',
            backgroundColor: tokens.bg,
            borderTopLeftRadius: radii.xl,
            borderTopRightRadius: radii.xl,
            paddingTop: 8,
            paddingHorizontal: 18,
            // The keyboard already covers the navigation bar, so its inset would be a gap.
            paddingBottom: 16 + (keyboard > 0 ? 0 : insets.bottom),
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
              <IconButton icon="close" label={closeLabel} variant="plain" onPress={onClose} />
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
      </View>
    </Modal>
  );
}
