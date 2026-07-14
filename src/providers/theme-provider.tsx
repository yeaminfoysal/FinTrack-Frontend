/**
 * Theme provider. Colors come from the prototype tokens and are applied via
 * inline style so light/dark switches instantly. Preference (light/dark/system)
 * is persisted in the SQLite meta table.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { getDb } from '@/lib/db';
import { getMeta, setMeta } from '@/lib/db/repo';
import { darkTokens, lightTokens, type ThemeMode, type ThemeTokens } from '@/constants/tokens';

export type ThemePreference = ThemeMode | 'system';

interface ThemeContextValue {
  tokens: ThemeTokens;
  scheme: ThemeMode;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const META_KEY = 'themeMode';

function readSavedPreference(): ThemePreference {
  const db = getDb();
  if (!db) return 'system';
  try {
    const saved = getMeta(db, META_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  } catch {
    // ignore
  }
  return 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  // Read the persisted preference synchronously on first render (no effect).
  const [preference, setPreferenceState] = useState<ThemePreference>(readSavedPreference);

  const setPreference = (p: ThemePreference) => {
    setPreferenceState(p);
    const db = getDb();
    if (db) {
      try {
        setMeta(db, META_KEY, p);
      } catch {
        // ignore
      }
    }
  };

  const scheme: ThemeMode = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo<ThemeContextValue>(
    () => ({
      tokens: scheme === 'dark' ? darkTokens : lightTokens,
      scheme,
      preference,
      setPreference,
      toggle: () => setPreference(scheme === 'dark' ? 'light' : 'dark'),
    }),
    [scheme, preference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
