import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { withAlpha } from '@/constants/tokens';
import { useTheme } from '@/providers/theme-provider';

/** First letter of a name, keeping Bangla vowel signs with their consonant (e.g. "রা" for রাফিদ). */
export function initialOf(name: string): string {
  const chars = Array.from(name.trim());
  if (chars.length === 0) return '?';
  let initial = chars[0];
  for (let i = 1; i < chars.length && /[ঁ-ঃ়া-ৌৗ]/.test(chars[i]); i++) {
    initial += chars[i];
  }
  return initial.toLocaleUpperCase();
}

export function Avatar({ name, size = 42 }: { name: string; size?: number }) {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size / 3),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: withAlpha(tokens.primary, 0.12),
        borderColor: tokens.line,
        borderWidth: 1,
      }}>
      <Text style={{ fontSize: Math.round(size * 0.42), fontWeight: '700', color: tokens.primary }}>{initialOf(name)}</Text>
    </View>
  );
}
