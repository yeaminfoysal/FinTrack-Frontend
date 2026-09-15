import { useState } from 'react';
import { Modal, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/providers/theme-provider';
import { useUiStore, type ConfirmDialog } from '@/stores/ui';

/** In-app confirm dialog (Alert.alert does nothing on web). Mounted once in the root layout. */
export function DialogHost() {
  const { tokens } = useTheme();
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
          <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: '700', color: tokens.ink }}>
            {shown?.title}
          </Text>
          {shown?.message ? (
            <Text style={{ fontSize: 14, lineHeight: 22, color: tokens.muted }}>{shown.message}</Text>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <Button
              label={shown?.cancelLabel ?? 'বাতিল'}
              variant="secondary"
              onPress={() => closeDialog(false)}
              style={{ flex: 1 }}
            />
            <Button
              label={shown?.confirmLabel ?? 'ঠিক আছে'}
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
