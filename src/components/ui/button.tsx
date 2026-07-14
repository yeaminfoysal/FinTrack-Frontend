import { ActivityIndicator, Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/providers/theme-provider';

type Variant = 'primary' | 'outline' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  /** Accent color for outline/ghost (defaults to primary). */
  color?: string;
  leftGlyph?: string;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  color,
  leftGlyph,
  loading,
  disabled,
  style,
}: ButtonProps) {
  const { tokens } = useTheme();
  const accent = color ?? tokens.primary;

  const bg =
    variant === 'primary' ? tokens.primary : variant === 'danger' ? tokens.expense : 'transparent';
  const fg = variant === 'primary' || variant === 'danger' ? '#fff' : accent;
  const border = variant === 'outline' ? accent : 'transparent';

  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      style={({ pressed }) => [
        {
          borderRadius: 14,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: border,
          backgroundColor: bg,
          paddingVertical: 14,
          paddingHorizontal: 16,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {leftGlyph ? <Text style={{ color: fg, fontSize: 17 }}>{leftGlyph}</Text> : null}
          <Text style={{ color: fg, fontSize: 14, fontWeight: '600' }}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}
