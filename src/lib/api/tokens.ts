/** Token storage — tokens live ONLY in expo-secure-store, never plain storage. */
import * as SecureStore from 'expo-secure-store';

const ACCESS = 'ft_access_token';
const REFRESH = 'ft_refresh_token';

export async function getAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(ACCESS);
  } catch {
    return null;
  }
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH);
  } catch {
    return null;
  }
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(ACCESS, access);
    await SecureStore.setItemAsync(REFRESH, refresh);
  } catch (e) {
    // Never let a storage failure block the auth flow.
    console.warn('[tokens] failed to persist tokens:', e);
  }
}

export async function clearTokens(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(ACCESS);
    await SecureStore.deleteItemAsync(REFRESH);
  } catch {
    // ignore
  }
}
