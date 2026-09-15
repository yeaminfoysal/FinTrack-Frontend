import { useEffect } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/providers/theme-provider';
import { useUiStore } from '@/stores/ui';

/** Snackbar for confirmations and errors, with an optional action (e.g. undo). Mounted once in the root layout. */
export function ToastHost() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useUiStore((s) => s.toast);
  const hideToast = useUiStore((s) => s.hideToast);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => hideToast(toast.id), toast.durationMs ?? (toast.actionLabel ? 6000 : 3500));
    return () => clearTimeout(timer);
  }, [toast, hideToast]);

  if (!toast) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 82, alignItems: 'center', paddingHorizontal: 14 }}>
      <View
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={{
          width: '100%',
          maxWidth: 480,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: tokens.ink,
          borderRadius: 14,
          paddingVertical: 10,
          paddingLeft: 14,
          paddingRight: toast.actionLabel ? 6 : 14,
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
        }}>
        <Icon name={toast.tone === 'error' ? 'alert-circle-outline' : 'checkmark-circle'} size={20} color={tokens.bg} />
        <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: tokens.bg }}>{toast.message}</Text>
        {toast.actionLabel ? (
          <Pressable
            onPress={() => {
              hideToast(toast.id);
              toast.onAction?.();
            }}
            accessibilityRole="button"
            hitSlop={6}
            style={({ pressed }) => ({
              minHeight: 40,
              justifyContent: 'center',
              paddingHorizontal: 12,
              borderRadius: 10,
              backgroundColor: pressed ? 'rgba(127,127,127,0.25)' : 'transparent',
            })}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: tokens.bg, textDecorationLine: 'underline' }}>
              {toast.actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
