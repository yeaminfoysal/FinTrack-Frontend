import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react';
import { Keyboard, Platform, ScrollView, TextInput, View, type ScrollViewProps } from 'react-native';

import { useKeyboardOverlap } from '@/hooks/use-keyboard-overlap';

/** Space left between the bottom of the focused field and the top of the keyboard. */
const FOCUS_GAP = 20;
/** Long enough for the keyboard to finish opening, so the frame we measure against is final. */
const SETTLE_MS = 140;

/**
 * Lets a field ask the scroll view it sits in to bring it above the keyboard. Needed for
 * the second field someone taps: the keyboard is already open by then, so nothing about
 * the keyboard changes and only the focus move says the view has to scroll.
 */
const ScrollFocusContext = createContext<(() => void) | null>(null);

/** Call from a text input's `onFocus`. Null outside a KeyboardScrollView, which is fine. */
export function useScrollFocusedIntoView(): (() => void) | null {
  return useContext(ScrollFocusContext);
}

/**
 * A ScrollView that keeps the focused field above the keyboard.
 *
 * Android stopped resizing the window for the keyboard under edge-to-edge (the default
 * from SDK 54), so `adjustResize` alone no longer lifts anything and a field low in a form
 * — the description box on the add screens — ends up behind the keys. This adds the
 * covered height to the scrollable content and scrolls the focused field back into sight.
 * iOS has had `automaticallyAdjustKeyboardInsets` for this since iOS 13, so there it just
 * lets UIKit do the same job.
 */
export function KeyboardScrollView({ children, style, ...props }: ScrollViewProps & { children: ReactNode }) {
  const scrollRef = useRef<ScrollView>(null);
  const offsetY = useRef(0);
  const overlap = useKeyboardOverlap();

  const bringFocusedIntoView = useCallback(() => {
    if (Platform.OS !== 'android') return;
    setTimeout(() => {
      // Read the keyboard's frame now rather than closing over it: by the time this runs
      // the keyboard may have opened, grown or changed kind. Undefined means it is closed.
      const keyboard = Keyboard.metrics();
      const input = TextInput.State.currentlyFocusedInput();
      if (!keyboard || !input) return;
      input.measureInWindow((_x, y, _width, height) => {
        // Where the window did resize for the keyboard, its top sits below the window and
        // this comes out negative — the resize already did the work.
        const hidden = y + height + FOCUS_GAP - keyboard.screenY;
        if (hidden > 0) scrollRef.current?.scrollTo({ y: offsetY.current + hidden, animated: true });
      });
    }, SETTLE_MS);
  }, []);

  // The keyboard opening (or growing) can bury the field that is already focused.
  useEffect(() => {
    if (overlap > 0) bringFocusedIntoView();
  }, [overlap, bringFocusedIntoView]);

  return (
    <ScrollFocusContext.Provider value={bringFocusedIntoView}>
      <ScrollView
        ref={scrollRef}
        // Fills whatever it is placed in, the way the shells' layouts expect.
        style={[{ flex: 1 }, style]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        onScroll={(e) => {
          offsetY.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        {...props}>
        {children}
        {/* Room to scroll the last field clear of the keyboard; iOS gets it from UIKit. */}
        {overlap > 0 && Platform.OS === 'android' ? <View style={{ height: overlap }} /> : null}
      </ScrollView>
    </ScrollFocusContext.Provider>
  );
}
