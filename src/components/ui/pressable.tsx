import { forwardRef, useState, type ReactNode } from 'react';
import {
  Pressable as RNPressable,
  type PressableProps as RNPressableProps,
  type StyleProp,
  type View,
  type ViewStyle,
} from 'react-native';

/**
 * Use this instead of React Native's Pressable. NativeWind v4 wraps RN's Pressable in a
 * style interop that drops function styles (`style={({ pressed }) => …}`) on Android and
 * iOS — they still work on web, so the breakage only shows up on a device. This wrapper
 * tracks the pressed state itself and always hands Pressable a plain style.
 */

interface PressState {
  pressed: boolean;
}

export type PressableProps = Omit<RNPressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle> | ((state: PressState) => StyleProp<ViewStyle>);
  children?: ReactNode | ((state: PressState) => ReactNode);
};

export const Pressable = forwardRef<View, PressableProps>(function Pressable(
  { style, children, onPressIn, onPressOut, ...props },
  ref,
) {
  const [pressed, setPressed] = useState(false);
  const state = { pressed };
  return (
    <RNPressable
      ref={ref}
      {...props}
      onPressIn={(event) => {
        setPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        onPressOut?.(event);
      }}
      style={typeof style === 'function' ? style(state) : style}>
      {typeof children === 'function' ? children(state) : children}
    </RNPressable>
  );
});
