/**
 * Web shim for the SQLite bootstrap. expo-sqlite's web build pulls in a wasm
 * worker asset that isn't always present, and the app's data layer already
 * falls back to an in-memory seed when no database is available. On web we
 * simply report "no database" and let that fallback run.
 */
import type { SQLiteDatabase } from 'expo-sqlite';

export function getDb(): SQLiteDatabase | null {
  return null;
}

export function hasDb(): boolean {
  return false;
}
