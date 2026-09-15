import { forwardRef } from 'react';
import { StyleSheet, Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { fontFamilyFor } from '@/constants/fonts';

/**
 * Drop-in replacement for React Native's Text that renders in the app typeface.
 * The requested fontWeight selects the matching Hind Siliguri face instead of a
 * faux bold, so weights look the same on Android, iOS and web.
 */
export const Text = forwardRef<RNText, TextProps>(function Text({ style, ...props }, ref) {
  const flat: TextStyle = StyleSheet.flatten(style) ?? {};
  return (
    <RNText
      ref={ref}
      {...props}
      style={[style, { fontFamily: flat.fontFamily ?? fontFamilyFor(flat.fontWeight), fontWeight: 'normal' }]}
    />
  );
});
