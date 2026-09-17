import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, Platform, type KeyboardEvent } from 'react-native';

/**
 * How much of the window the keyboard actually covers, in px (0 when it is closed).
 *
 * Measured against the window rather than taken from the keyboard's own height: where the
 * window is resized for the keyboard (Android `adjustResize` on older releases) the view
 * never reaches under it and this comes out as 0, so nothing is lifted twice. Where it is
 * not — Android under edge-to-edge, which is every SDK 54+ build, and iOS always — this is
 * the real overlap.
 */
export function useKeyboardOverlap(): number {
  const [overlap, setOverlap] = useState(0);

  useEffect(() => {
    // iOS reports the keyboard before it animates, so the layout moves with it.
    const ios = Platform.OS === 'ios';
    const onShow = (e: KeyboardEvent) =>
      setOverlap(Math.max(0, Math.round(Dimensions.get('window').height - e.endCoordinates.screenY)));

    const subscriptions = [
      Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', onShow),
      Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setOverlap(0)),
      // Switching to an emoji or suggestion keyboard changes the height without a show event.
      ...(ios ? [Keyboard.addListener('keyboardWillChangeFrame', onShow)] : []),
    ];
    return () => subscriptions.forEach((s) => s.remove());
  }, []);

  return overlap;
}
