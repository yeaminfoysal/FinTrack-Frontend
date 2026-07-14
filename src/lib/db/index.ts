/**
 * SQLite bootstrap. SQLite is the source of truth for all persistent data.
 * Uses the synchronous expo-sqlite API. If the platform can't provide SQLite
 * (e.g. web without the wasm worker), getDb() returns null and the app falls
 * back to an in-memory seed so previews still run.
 */
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'fintrack.db';

const SCHEMA = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS income (
  id TEXT PRIMARY KEY NOT NULL,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  date TEXT NOT NULL,
  note TEXT,
  isDeleted INTEGER NOT NULL DEFAULT 0,
  deletedAt TEXT,
  syncStatus TEXT NOT NULL DEFAULT 'PENDING',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS expense (
  id TEXT PRIMARY KEY NOT NULL,
  amount INTEGER NOT NULL,
  category TEXT NOT NULL,
  date TEXT NOT NULL,
  description TEXT,
  isDeleted INTEGER NOT NULL DEFAULT 0,
  deletedAt TEXT,
  syncStatus TEXT NOT NULL DEFAULT 'PENDING',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS loan (
  id TEXT PRIMARY KEY NOT NULL,
  direction TEXT NOT NULL,
  personName TEXT NOT NULL,
  amount INTEGER NOT NULL,
  date TEXT NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  settledDate TEXT,
  isDeleted INTEGER NOT NULL DEFAULT 0,
  deletedAt TEXT,
  syncStatus TEXT NOT NULL DEFAULT 'PENDING',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS monthly_summary (
  id TEXT PRIMARY KEY NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  openingBalance INTEGER NOT NULL,
  totalIncome INTEGER NOT NULL,
  totalDailyExpense INTEGER NOT NULL,
  outstandingLent INTEGER NOT NULL,
  outstandingBorrowed INTEGER NOT NULL,
  untrackedExpense INTEGER NOT NULL,
  monthlySaving INTEGER NOT NULL,
  closingBalance INTEGER NOT NULL,
  practicalBalance INTEGER,
  isDeleted INTEGER NOT NULL DEFAULT 0,
  deletedAt TEXT,
  syncStatus TEXT NOT NULL DEFAULT 'PENDING',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  UNIQUE(year, month)
);

CREATE TABLE IF NOT EXISTS practical_balance (
  monthKey TEXT PRIMARY KEY NOT NULL,
  cash INTEGER NOT NULL DEFAULT 0,
  bank INTEGER NOT NULL DEFAULT 0,
  mfs INTEGER NOT NULL DEFAULT 0,
  amount INTEGER NOT NULL DEFAULT 0,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT
);
`;

let db: SQLite.SQLiteDatabase | null = null;
let tried = false;

export function getDb(): SQLite.SQLiteDatabase | null {
  if (db || tried) return db;
  tried = true;
  try {
    const instance = SQLite.openDatabaseSync(DB_NAME);
    instance.execSync(SCHEMA);
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
