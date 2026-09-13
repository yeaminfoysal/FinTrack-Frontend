import '@/global.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from '@/providers/theme-provider';
import { useDataStore } from '@/stores/data';
import { useSessionStore } from '@/stores/session';
import { useSyncStore } from '@/stores/sync';

const queryClient = new QueryClient();

function AuthGate({ children }: { children: ReactNode }) {
  const status = useSessionStore((s) => s.status);
  const hydrate = useSessionStore((s) => s.hydrate);
  const initData = useDataStore((s) => s.init);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    initData();
    hydrate();
  }, [initData, hydrate]);

  // Auto-pull when app returns to foreground (covers both native & web focus).
  const appState = useRef<AppStateStatus>(AppState.currentState);
  useEffect(() => {
    if (status !== 'authenticated') return;
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        // A month may have ended while the app sat in the background.
        useDataStore.getState().closeMonths();
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
    }
  }, [status, segments, router]);

  return children;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthGate>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="settings" />
              <Stack.Screen name="add" options={{ presentation: 'modal' }} />
              <Stack.Screen name="add-income" options={{ presentation: 'modal' }} />
              <Stack.Screen name="add-expense" options={{ presentation: 'modal' }} />
              <Stack.Screen name="add-loan" options={{ presentation: 'modal' }} />
            </Stack>
          </AuthGate>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
