/**
 * The app's language. Bangla is the default; English is a choice in Settings.
 *
 * It lives on the device, not the account — which language you read your phone in
 * is a property of the phone — so it sits in the local meta table next to the theme
 * and never syncs.
 *
 * The current catalogue is kept in a module variable rather than a store, because
 * the pure helpers that format a date, a due label or the PDF have no React around
 * them. `useStrings()` subscribes a component to changes; everything else calls
 * `strings()` and gets the same object.
 */
import { useSyncExternalStore } from 'react';

import { getDb } from '@/lib/db';
import { getMeta, setMeta } from '@/lib/db/repo';
import bn, { type Strings } from '@/lib/i18n/bn';
import en from '@/lib/i18n/en';

export type { Strings };

export type Lang = 'bn' | 'en';

/** The app is written in Bangla first; English is the translation. */
export const DEFAULT_LANG: Lang = 'bn';

export const LANGUAGES: Lang[] = ['bn', 'en'];

const CATALOGUES: Record<Lang, Strings> = { bn, en };

const META_KEY = 'language';

const isLang = (value: unknown): value is Lang => value === 'bn' || value === 'en';

/** undefined until the stored choice has been read — reading needs the database open. */
let current: Lang | undefined;

const listeners = new Set<() => void>();

function readSaved(): Lang {
  try {
    const db = getDb();
    const saved = db ? getMeta(db, META_KEY) : typeof localStorage !== 'undefined' ? localStorage.getItem(META_KEY) : null;
    if (isLang(saved)) return saved;
  } catch {
    // no storage yet — the default holds for this session
  }
  return DEFAULT_LANG;
}

function persist(lang: Lang): void {
  try {
    const db = getDb();
    if (db) setMeta(db, META_KEY, lang);
    else if (typeof localStorage !== 'undefined') localStorage.setItem(META_KEY, lang);
  } catch {
    // storage blocked — the choice still holds for this session
  }
}

/**
 * Web only: keeps `<html lang>` in step with the app, for screen readers and line
 * breaking. The static shell (+html.tsx) has to hardcode one, because it is rendered
 * before any device preference can be known.
 */
function syncDocumentLang(lang: Lang): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lang;
}

export function getLanguage(): Lang {
  if (current === undefined) {
    current = readSaved();
    syncDocumentLang(current);
  }
  return current;
}

/**
 * The current catalogue. The same object for as long as the language doesn't change,
 * so it is safe as a `useSyncExternalStore` snapshot and as a hook dependency.
 */
export function strings(): Strings {
  return CATALOGUES[getLanguage()];
}

/**
 * One named language's catalogue. Pure helpers take the language as an argument so the
 * dependency is visible — to a reader, to a test, and to the exhaustive-deps rule.
 */
export function stringsFor(lang: Lang): Strings {
  return CATALOGUES[lang];
}

export function setLanguage(lang: Lang): void {
  if (getLanguage() === lang) return;
  current = lang;
  persist(lang);
  syncDocumentLang(lang);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Re-renders the component whenever the language changes. */
export function useStrings(): Strings {
  return useSyncExternalStore(subscribe, strings, strings);
}

export function useLanguage(): Lang {
  return useSyncExternalStore(subscribe, getLanguage, getLanguage);
}

/**
 * Is this only the stand-in name? Checked against every language, because the account
 * may have been created before the language was switched.
 */
export function isPlaceholderName(name: string): boolean {
  return LANGUAGES.some((l) => CATALOGUES[l].profile.defaultName === name);
}

/** Test hook: forget the cached choice so the next read goes back to storage. */
export function resetLanguageForTests(): void {
  current = undefined;
  for (const listener of listeners) listener();
}
