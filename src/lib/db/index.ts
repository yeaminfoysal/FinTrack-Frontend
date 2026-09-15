/**
 * SQLite bootstrap. SQLite is the source of truth for all persistent data.
 * Uses the synchronous expo-sqlite API; the schema comes from the versioned
 * steps in ./migrations. If the platform can't provide SQLite (e.g. web without
 * the wasm worker), getDb() returns null and the app falls back to in-memory
 * state so previews still run.
 */
import * as SQLite from 'expo-sqlite';

import { migrate } from '@/lib/db/migrations';

const DB_NAME = 'fintrack.db';

let db: SQLite.SQLiteDatabase | null = null;
let tried = false;

export function getDb(): SQLite.SQLiteDatabase | null {
  if (db || tried) return db;
  tried = true;
  try {
    const instance = SQLite.openDatabaseSync(DB_NAME);
    // WAL can't be switched on inside a transaction, so it goes before the migrations.
    instance.execSync('PRAGMA journal_mode = WAL;');
    migrate(instance);
    db = instance;
  } catch (e) {
    console.warn('[db] SQLite unavailable, using in-memory fallback:', e);
    db = null;
  }
  return db;
}

export function hasDb(): boolean {
  return getDb() !== null;
}
