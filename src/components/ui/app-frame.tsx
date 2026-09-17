/**
 * Caps the web build to a phone-sized column. The UI is laid out for a phone, so
 * at desktop width the cards stretch and the floating tab bar drifts apart; this
 * centres everything in a 480px column on a dimmed backdrop instead.
 * Native renders its children untouched.
 */
import type { ReactNode } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';

import { darken } from '@/constants/tokens';
import { useTheme } from '@/providers/theme-provider';

/** Width the app column is capped to on web. Shared with sheets so they line up. */
export const APP_MAX_WIDTH = 480;

export function AppFrame({ children }: { children: ReactNode }) {
  const { tokens, scheme } = useTheme();
  const { width } = useWindowDimensions();

  if (Platform.OS !== 'web') return <>{children}</>;

  // On a phone browser the column already fills the screen — edges there would
  // just be hairlines down the sides of the viewport.
  const framed = width > APP_MAX_WIDTH;
  // A touch darker than the app background, so the column reads as the page.
  const backdrop = darken(tokens.bg, scheme === 'dark' ? 0.45 : 0.08);

  return (
    <View style={{ flex: 1, backgroundColor: backdrop, alignItems: 'center' }}>
      <View
        style={{
          flex: 1,
          width: '100%',
          maxWidth: APP_MAX_WIDTH,
          backgroundColor: tokens.bg,
          ...(framed
            ? {
                borderLeftWidth: 1,
                borderRightWidth: 1,
                borderColor: tokens.line,
                shadowColor: '#000',
                shadowOpacity: scheme === 'dark' ? 0.5 : 0.12,
                shadowRadius: 24,
                shadowOffset: { width: 0, height: 0 },
              }
            : null),
        }}>
        {children}
      </View>
    </View>
  );
}
