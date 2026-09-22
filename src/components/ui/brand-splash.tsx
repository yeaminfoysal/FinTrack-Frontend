/**
 * The launch screen the app draws for itself, on the same brand green and with
 * the mark at the same size as the native splash (app.json → expo-splash-screen).
 * So the handoff is invisible: the native splash goes away underneath an identical
 * picture, the wordmark fades up, and the whole thing dissolves into the app.
 *
 * It also hides the native splash — `onLayout` fires once this has actually been
 * laid out, which is the only moment where hiding can't flash the screen white.
 */
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, StyleSheet } from 'react-native';

import { Text } from '@/components/ui/text';
import { useStrings } from '@/lib/i18n';
import { textSize } from '@/constants/typography';

/** The ৳ set in Hind Siliguri Bold — the same mark the auth screens put in their
 *  badge, so the launch screen and the first screen carry one identity. */
const mark = require('../../../assets/images/splash-icon.png');

/** Brand green (lightTokens.primary). Deliberately the same in both themes — the
 *  splash is the brand, not the UI, so it can't disagree with app.json. */
const BRAND = '#0E7A52';
/** Matches `imageWidth` in app.json, so the mark doesn't jump on handoff. */
const MARK_SIZE = 160;

const WORDMARK_IN = 300;
const HOLD = 700;
const FADE_OUT = 300;
/** Web has no native animated module — asking for it there only logs a warning. */
const NATIVE_DRIVER = Platform.OS !== 'web';

export function BrandSplash({ onHidden }: { onHidden: () => void }) {
  const tagline = useStrings().brand.tagline;
  // Lazy useState, not useRef: the values have to survive re-renders without being
  // read during one, since the auth gate re-renders this tree while the splash is up.
  const [word] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(1));

  // The latest callback, so a new inline `onHidden` can't restart the timer below
  // and leave the splash on screen forever.
  const finish = useRef(onHidden);
  useEffect(() => {
    finish.current = onHidden;
  });

  useEffect(() => {
    Animated.timing(word, {
      toValue: 1,
      duration: WORDMARK_IN,
      delay: 80,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE_DRIVER,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(fade, {
        toValue: 0,
        duration: FADE_OUT,
        easing: Easing.in(Easing.quad),
        useNativeDriver: NATIVE_DRIVER,
      }).start(() => finish.current());
    }, HOLD);

    return () => clearTimeout(timer);
  }, [word, fade]);

  return (
    <Animated.View
      // The native splash is still covering this until the first layout lands.
      onLayout={() => {
        SplashScreen.hideAsync().catch(() => {});
      }}
      style={[styles.fill, { opacity: fade }]}>
      {/* Light content: the brand green is dark enough to carry white icons. */}
      <StatusBar style="light" />
      <Image source={mark} style={styles.mark} resizeMode="contain" />
      {/* Absolute, so adding the wordmark doesn't push the mark off the centre
          the native splash left it on. */}
      <Animated.View
        style={[
          styles.lockup,
          {
            opacity: word,
            transform: [{ translateY: word.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
          },
        ]}>
        <Text style={styles.wordmark}>FinTrack</Text>
        <Text style={styles.tagline}>{tagline}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: { width: MARK_SIZE, height: MARK_SIZE },
  lockup: {
    position: 'absolute',
    top: '50%',
    marginTop: MARK_SIZE / 2 + 20,
    alignItems: 'center',
  },
  wordmark: {
    fontSize: textSize.display,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: textSize.sm,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 2,
  },
});
