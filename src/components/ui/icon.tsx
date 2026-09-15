import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import type { StyleProp, TextStyle } from 'react-native';

export type IconName = ComponentProps<typeof Ionicons>['name'];

interface IconProps {
  name: IconName;
  color: string;
  size?: number;
  style?: StyleProp<TextStyle>;
}

/** Decorative vector icon. When an icon is a control's only content, label the control (see IconButton). */
export function Icon({ name, color, size = 20, style }: IconProps) {
  return (
    <Ionicons
      name={name}
      size={size}
      color={color}
      style={style}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    />
  );
}
