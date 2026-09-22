import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { textSize } from '@/constants/typography';
import { useStrings } from '@/lib/i18n';
import { useTheme } from '@/providers/theme-provider';
import { useUiStore, type ConfirmDialog } from '@/stores/ui';

/** In-app confirm dialog (Alert.alert does nothing on web). Mounted once in the root layout. */
export function DialogHost() {
  const { tokens } = useTheme();
  const t = useStrings().common;
  const dialog = useUiStore((s) => s.dialog);
  const closeDialog = useUiStore((s) => s.closeDialog);
  // Keep the last dialog's text on screen while the modal fades out.
  const [shown, setShown] = useState<ConfirmDialog | null>(dialog);
  if (dialog && dialog !== shown) setShown(dialog);

  return (
    <Modal
      visible={!!dialog}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => closeDialog(false)}>
      <Pressable
        onPress={() => closeDialog(false)}
        style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        {/* Inner Pressable swallows taps so only the backdrop dismisses. */}
        <Pressable
          onPress={() => {}}
          accessibilityViewIsModal
          style={{
            width: '100%',
            maxWidth: 420,
            alignSelf: 'center',
            backgroundColor: tokens.surface,
            borderRadius: 20,
            padding: 20,
            gap: 8,
          }}>
          <Text accessibilityRole="header" style={{ fontSize: textSize.lg, fontWeight: '700', color: tokens.ink }}>
            {shown?.title}
          </Text>
          {shown?.message ? (
            <Text style={{ fontSize: textSize.md, lineHeight: 22, color: tokens.muted }}>{shown.message}</Text>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <Button
              label={shown?.cancelLabel ?? t.cancel}
              variant="secondary"
              onPress={() => closeDialog(false)}
              style={{ flex: 1 }}
            />
            <Button
              label={shown?.confirmLabel ?? t.confirm}
              variant={shown?.destructive ? 'danger' : 'primary'}
              onPress={() => closeDialog(true)}
              style={{ flex: 1 }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
