/**
 * Session (auth) state. Tokens live in SecureStore; this store only tracks the
 * in-memory session. First login must be online; afterwards the refresh token
 * keeps the user signed in offline.
 */
import { create } from 'zustand';

import { setOnAuthFailure } from '@/lib/api/client';
import { AuthApi } from '@/lib/api/endpoints';
import { clearTokens, getAccessToken, setTokens } from '@/lib/api/tokens';
import { useDataStore } from '@/stores/data';
import { useSyncStore } from '@/stores/sync';

export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface SessionUser {
  email: string;
  name: string;
}

interface SessionState {
  status: SessionStatus;
  user: SessionUser | null;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, openingSavings: number) => Promise<void>;
  loginDemo: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set) => {
  // Force logout when a token refresh ultimately fails.
  setOnAuthFailure(() => {
    set({ status: 'unauthenticated', user: null });
  });

  return {
    status: 'loading',
    user: null,

    hydrate: async () => {
      const token = await getAccessToken();
      if (token) {
        set({ status: 'authenticated' });
        useSyncStore.getState().pull();
      } else {
        set({ status: 'unauthenticated' });
      }
    },

    login: async (email, password) => {
      const res = await AuthApi.login(email, password);
      await setTokens(res.accessToken, res.refreshToken);
      const name = res.user.name ?? email;
      // Point local storage at this account (wipes leftover demo/other-user data).
      useDataStore.getState().prepareForUser(res.user.email, { email: res.user.email, name });
      set({ status: 'authenticated', user: { email: res.user.email, name } });
      useSyncStore.getState().pull();
    },

    register: async (email, password, name, openingSavings) => {
      const res = await AuthApi.register({ email, password, name, openingSavings });
      await setTokens(res.accessToken, res.refreshToken);
      useDataStore
        .getState()
        .prepareForUser(res.user.email, { email: res.user.email, name: res.user.name ?? name, openingSavings });
      set({ status: 'authenticated', user: { email: res.user.email, name: res.user.name ?? name } });
      useSyncStore.getState().pull();
    },

    /** Offline demo entry — loads the demo dataset, no backend required. */
    loginDemo: async () => {
      await setTokens('demo-access-token', 'demo-refresh-token');
      useDataStore.getState().seedDemo();
      set({ status: 'authenticated', user: { email: 'atizoom2@gmail.com', name: 'রাফিদ হাসান' } });
    },

    logout: async () => {
      await clearTokens();
      set({ status: 'unauthenticated', user: null });
    },
  };
});
