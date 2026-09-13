/**
 * Token storage — SecureStore on native, localStorage on web.
 *
 * expo-secure-store has NO web implementation (its web shim is an empty
 * object), so every SecureStore call silently fails on web. This module
 * detects the platform and falls back to localStorage for the browser so
 * tokens survive page refreshes and pull() can run on hydration.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ACCESS = 'ft_access_token';
const REFRESH = 'ft_refresh_token';

const isWeb = Platform.OS === 'web';

// --------------- helpers ---------------

async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (e) {
    console.warn('[tokens] failed to persist token:', e);
  }
}

async function removeItem(key: string): Promise<void> {
  if (isWeb) {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // ignore
  }
}

// --------------- public API ---------------

export async function getAccessToken(): Promise<string | null> {
  return getItem(ACCESS);
}

export async function getRefreshToken(): Promise<string | null> {
  return getItem(REFRESH);
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  await setItem(ACCESS, access);
  await setItem(REFRESH, refresh);
}

export async function clearTokens(): Promise<void> {
  await removeItem(ACCESS);
  await removeItem(REFRESH);
}
