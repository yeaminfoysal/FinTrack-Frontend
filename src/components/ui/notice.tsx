import { View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { withAlpha } from '@/constants/tokens';
import { useTheme } from '@/providers/theme-provider';

/** Inline message box for form-level errors or confirmations (shows on web too, unlike Alert). */
export function Notice({ text, tone = 'error' }: { text: string; tone?: 'error' | 'success' }) {
  const { tokens } = useTheme();
  const color = tone === 'error' ? tokens.expense : tokens.income;
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: withAlpha(color, 0.35),
        backgroundColor: withAlpha(color, 0.1),
      }}>
      <Icon name={tone === 'error' ? 'alert-circle-outline' : 'checkmark-circle'} size={18} color={color} />
      <Text style={{ flex: 1, fontSize: 13.5, lineHeight: 20, color: tokens.ink }}>{text}</Text>
    </View>
  );
}
