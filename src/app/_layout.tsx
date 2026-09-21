import {
  HindSiliguri_400Regular,
  HindSiliguri_500Medium,
  HindSiliguri_600SemiBold,
  HindSiliguri_700Bold,
} from '@expo-google-fonts/hind-siliguri';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PageTitle } from '@/components/page-title';
import { AppFrame } from '@/components/ui/app-frame';
import { BrandSplash } from '@/components/ui/brand-splash';
import { DialogHost } from '@/components/ui/dialog-host';
import { ToastHost } from '@/components/ui/toast-host';
import { useReminders } from '@/hooks/use-reminders';
import { localDigits } from '@/lib/digits';
import { ThemeProvider } from '@/providers/theme-provider';
import { useDataStore } from '@/stores/data';
import { useSessionStore } from '@/stores/session';
import { useSyncStore } from '@/stores/sync';
import { showToast } from '@/stores/ui';

// Keep the splash screen up until the app fonts are ready, so text never flashes in a fallback face.
SplashScreen.preventAutoHideAsync().catch(() => {});

/** Writes the standing entries that have come due and says so, since they weren't typed. */
function catchUpRecurring(): void {
  const written = useDataStore.getState().runRecurring();
  if (written > 0) {
    showToast({ message: `${localDigits(written)}টি নিয়মিত এন্ট্রি যোগ হয়েছে` });
  }
}

function AuthGate({ children }: { children: ReactNode }) {
  const status = useSessionStore((s) => s.status);
  const hydrate = useSessionStore((s) => s.hydrate);
  const initData = useDataStore((s) => s.init);
  const dataReady = useDataStore((s) => s.ready);
  const onboardingDone = useDataStore((s) => s.onboardingDone);
  const segments = useSegments();
  const router = useRouter();

  useReminders();

  useEffect(() => {
    initData();
    hydrate();
    // Standing entries have no cron on a phone, so opening the app catches up on them.
    catchUpRecurring();
  }, [initData, hydrate]);

  // Auto-pull when app returns to foreground (covers both native & web focus).
  const appState = useRef<AppStateStatus>(AppState.currentState);
  useEffect(() => {
    if (status !== 'authenticated') return;
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        // A month may have ended — and standing entries come due — while the app sat in the background.
        useDataStore.getState().closeMonths();
        catchUpRecurring();
        useSyncStore.getState().pull();
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [status]);

  useEffect(() => {
    if (status === 'loading') return;
    const inAuthGroup = segments[0] === '(auth)';
    if (status === 'unauthenticated' && !inAuthGroup) {
      router.replace('/login');
    } else if (status === 'authenticated' && inAuthGroup) {
      router.replace('/');
    } else if (status === 'authenticated' && dataReady && !onboardingDone && segments[0] !== 'onboarding') {
      // Nothing in the app makes sense before the opening balance, so first run goes here.
      router.replace('/onboarding');
    }
  }, [status, dataReady, onboardingDone, segments, router]);

  return children;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
    HindSiliguri_400Regular,
    HindSiliguri_500Medium,
    HindSiliguri_600SemiBold,
    HindSiliguri_700Bold,
  });
  // A font that fails to load falls back to the system face instead of blocking the app.
  const ready = fontsLoaded || fontError != null;
  // BrandSplash takes over from the native splash and hides it itself, once it has
  // painted the same picture — so there is never a bare frame between the two.
  const [branding, setBranding] = useState(true);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        {/* Web only: keeps the phone layout in a centred column. */}
        <AppFrame>
          <AuthGate>
            {/* Fallback document title; each screen overrides it with its own <PageTitle />. */}
            <PageTitle />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="settings" />
              <Stack.Screen name="categories" />
              <Stack.Screen name="recurring" />
              <Stack.Screen name="add" options={{ presentation: 'modal' }} />
              <Stack.Screen name="add-income" options={{ presentation: 'modal' }} />
              <Stack.Screen name="add-expense" options={{ presentation: 'modal' }} />
              <Stack.Screen name="add-loan" options={{ presentation: 'modal' }} />
            </Stack>
          </AuthGate>
          {/* Inside the frame so the snackbar lines up with the column. */}
          <ToastHost />
        </AppFrame>
        {/* Modal-based, so it covers the viewport on its own. */}
        <DialogHost />
        {/* Outside AppFrame so the brand fills the whole viewport on web, not just the column. */}
        {branding ? <BrandSplash onHidden={() => setBranding(false)} /> : null}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
