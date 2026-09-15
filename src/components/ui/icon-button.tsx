import type { StyleProp, ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { useTheme } from '@/providers/theme-provider';

interface IconButtonProps {
  icon: IconName;
  /** Read out by screen readers — required because the button has no visible text. */
  label: string;
  onPress?: () => void;
  size?: number;
  iconSize?: number;
  color?: string;
  variant?: 'soft' | 'plain';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Icon-only button with an accessible label and at least a 44×44 touch area. */
export function IconButton({
  icon,
  label,
  onPress,
  size = 40,
  iconSize = 20,
  color,
  variant = 'soft',
  disabled,
  style,
}: IconButtonProps) {
  const { tokens } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={Math.max(0, Math.ceil((44 - size) / 2))}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.32),
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: variant === 'soft' ? tokens.surface2 : 'transparent',
          borderWidth: variant === 'soft' ? 1 : 0,
          borderColor: tokens.line,
          opacity: disabled ? 0.35 : pressed ? 0.7 : 1,
        },
        style,
      ]}>
      <Icon name={icon} size={iconSize} color={color ?? tokens.ink} />
    </Pressable>
  );
}
