import { describe, expect, it } from '@jest/globals';

import { migrate, MIGRATIONS, type MigrationDb } from '@/lib/db/migrations';

/** An in-memory stand-in that records the SQL it runs and tracks user_version. */
function fakeDb(userVersion: number) {
  const state = { userVersion, executed: [] as string[], transactions: 0 };
  const db: MigrationDb = {
    getFirstSync<T>(source: string): T | null {
      return source === 'PRAGMA user_version' ? ({ user_version: state.userVersion } as T) : null;
    },
    execSync(source: string) {
      const version = /^PRAGMA user_version = (\d+)$/.exec(source.trim());
      if (version) state.userVersion = Number(version[1]);
      else state.executed.push(source);
    },
    withTransactionSync(task: () => void) {
      state.transactions += 1;
      task();
    },
  };
  return { db, state };
}

describe('migrate', () => {
  it('runs every step on a new database, each in its own transaction', () => {
    const { db, state } = fakeDb(0);
    expect(migrate(db, ['A', 'B'])).toBe(2);
    expect(state).toEqual({ userVersion: 2, executed: ['A', 'B'], transactions: 2 });
  });

  it('runs only the steps a database has not run yet', () => {
    const { db, state } = fakeDb(1);
    migrate(db, ['A', 'B', 'C']);
    expect(state.executed).toEqual(['B', 'C']);
    expect(state.userVersion).toBe(3);
  });

  it('does nothing on an up-to-date database', () => {
    const { db, state } = fakeDb(3);
    expect(migrate(db, ['A', 'B', 'C'])).toBe(3);
    expect(state.transactions).toBe(0);
  });

  it('keeps the first step safe for databases created before versioning', () => {
    expect(MIGRATIONS[0]).not.toMatch(/CREATE TABLE (?!IF NOT EXISTS)/);
  });
});
