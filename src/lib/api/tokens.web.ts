/**
 * Web token storage. expo-secure-store has no web implementation (its web
 * native module is an empty object), so setItemAsync throws in the browser.
 * On web we fall back to localStorage. Native uses tokens.ts (SecureStore).
 */
const ACCESS = 'ft_access_token';
const REFRESH = 'ft_refresh_token';

function safeGet(key: string): string | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function safeRemove(key: string): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export async function getAccessToken(): Promise<string | null> {
  return safeGet(ACCESS);
}

export async function getRefreshToken(): Promise<string | null> {
  return safeGet(REFRESH);
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  safeSet(ACCESS, access);
  safeSet(REFRESH, refresh);
}

export async function clearTokens(): Promise<void> {
  safeRemove(ACCESS);
  safeRemove(REFRESH);
}
