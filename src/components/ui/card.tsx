import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/providers/theme-provider';

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Use the subtler surface2 background. */
  soft?: boolean;
  padding?: number;
  radius?: number;
}

export function Card({ children, style, soft, padding = 14, radius = 16 }: CardProps) {
  const { tokens } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: soft ? tokens.surface2 : tokens.surface,
          borderColor: tokens.line,
          borderWidth: 1,
          borderRadius: radius,
          padding,
        },
        style,
      ]}>
      {children}
    </View>
  );
}
