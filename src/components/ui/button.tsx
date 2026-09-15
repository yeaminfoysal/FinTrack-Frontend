import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/providers/theme-provider';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  /** Accent color for outline/ghost (defaults to primary). */
  color?: string;
  /** Background for a primary button that needs another fill, e.g. the loan colors. */
  fill?: string;
  icon?: IconName;
  size?: 'md' | 'sm';
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  color,
  fill,
  icon,
  size = 'md',
  loading,
  disabled,
  accessibilityHint,
  style,
}: ButtonProps) {
  const { tokens } = useTheme();
  const accent = color ?? tokens.primary;
  const filled = variant === 'primary' || variant === 'danger';

  const bg =
    variant === 'primary'
      ? (fill ?? tokens.primaryFill)
      : variant === 'danger'
        ? tokens.expenseFill
        : variant === 'secondary'
          ? tokens.surface2
          : 'transparent';
  const fg = filled ? tokens.onFill : variant === 'secondary' ? tokens.ink : accent;
  const border = variant === 'outline' ? accent : variant === 'secondary' ? tokens.line : 'transparent';
  const small = size === 'sm';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      style={({ pressed }) => [
        {
          minHeight: small ? 40 : 48,
          borderRadius: 14,
          borderWidth: variant === 'outline' || variant === 'secondary' ? 1 : 0,
          borderColor: border,
          backgroundColor: bg,
          paddingVertical: small ? 8 : 12,
          paddingHorizontal: 16,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon ? <Icon name={icon} size={small ? 16 : 18} color={fg} /> : null}
          <Text style={{ color: fg, fontSize: small ? 13.5 : 15, fontWeight: '600' }}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}
