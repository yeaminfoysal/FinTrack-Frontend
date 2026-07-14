/** Axios instance with bearer auth + single-flight refresh on 401. */
import axios, { type AxiosRequestConfig } from 'axios';

import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '@/lib/api/tokens';

const BASE = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');

if (__DEV__) {
  // Confirm the env var was inlined. If this logs "/api" (empty BASE), the
  // .env wasn't picked up — restart Metro with `npx expo start -c`.
  console.log('[api] baseURL =', `${BASE}/api`);
  if (!BASE) console.warn('[api] EXPO_PUBLIC_API_URL is empty — requests will hit the dev server, not the backend.');
}

// eslint-disable-next-line import/no-named-as-default-member -- axios default export exposes create()
export const api = axios.create({
  baseURL: `${BASE}/api`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await axios.post(`${BASE}/api/auth/refresh`, { refreshToken });
    const { accessToken, refreshToken: newRefresh } = res.data ?? {};
    if (accessToken) {
      await setTokens(accessToken, newRefresh ?? refreshToken);
      return accessToken;
    }
  } catch {
    // fall through
  }
  return null;
}

/** Callback the session store registers so the interceptor can force logout. */
let onAuthFailure: (() => void) | null = null;
export function setOnAuthFailure(cb: (() => void) | null) {
  onAuthFailure = cb;
}

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;
    if (status === 401 && original && !original._retry) {
      original._retry = true;
      if (!refreshing) refreshing = refreshAccessToken();
      const newToken = await refreshing;
      refreshing = null;
      if (newToken) {
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      await clearTokens();
      onAuthFailure?.();
    }
    return Promise.reject(error);
  },
);
