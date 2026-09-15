/**
 * Versioned SQLite schema. `PRAGMA user_version` records how many steps a database
 * has run; opening the app runs the missing ones in order, each in a transaction
 * together with its version bump. A released step is never edited — every schema
 * change is a new step appended to MIGRATIONS.
 */

/** The part of expo-sqlite's SQLiteDatabase the migrator needs. */
export interface MigrationDb {
  getFirstSync<T>(source: string): T | null;
  execSync(source: string): void;
  withTransactionSync(task: () => void): void;
}

export const MIGRATIONS: readonly string[] = [
  // 1 — initial schema. IF NOT EXISTS: databases created before versioning already have it.
  `
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
`,
  // 2 — practical balance: when it was counted (entries dated before that are already in the
  // amount) and whether the server has it. For existing rows updatedAt is the closest known
  // count time, and PENDING uploads them on the next sync.
  `
ALTER TABLE practical_balance ADD COLUMN countedAt TEXT;
UPDATE practical_balance SET countedAt = updatedAt;
ALTER TABLE practical_balance ADD COLUMN syncStatus TEXT NOT NULL DEFAULT 'PENDING';
`,
];

/** Brings the database up to the latest schema and returns its version. */
export function migrate(db: MigrationDb, migrations: readonly string[] = MIGRATIONS): number {
  const current = db.getFirstSync<{ user_version: number }>('PRAGMA user_version')?.user_version ?? 0;
  for (let version = current; version < migrations.length; version++) {
    db.withTransactionSync(() => {
      db.execSync(migrations[version]);
      db.execSync(`PRAGMA user_version = ${version + 1}`);
    });
  }
  return Math.max(current, migrations.length);
}
