/**
 * Add / edit / delete / restore shared by incomes, expenses and loans. Every change
 * stamps the record PENDING, moves the counted balance by the cash that changed hands
 * after it was counted, and is written to SQLite.
 */
import { practicalPatch } from '@/features/balance/practical-slice';
import type { DataSlice, DataState } from '@/features/data-state';
import { withDb, type Db } from '@/features/storage/persist';
import type { CashEvent } from '@/lib/calc/practical';
import { nowIso } from '@/lib/records';
import type { BaseRecord } from '@/lib/types';

type SetState = Parameters<DataSlice<object>>[0];

export interface RecordKind<T extends BaseRecord> {
  /** Where the records live in the store. */
  list: 'incomes' | 'expenses' | 'loans';
  save: (db: Db, record: T) => void;
  /** Cash the record moves; [] once deleted. */
  cashEvents: (record: T) => CashEvent[];
}

export function recordActions<T extends BaseRecord>(set: SetState, kind: RecordKind<T>) {
  const listOf = (s: DataState) => s[kind.list] as unknown as T[];
  const withList = (list: T[]) => ({ [kind.list]: list }) as unknown as Partial<DataState>;

  /** Marks a copy of the record as an unsent local change. */
  const stamp = (record: T, patch: Partial<T>): T => ({
    ...record,
    ...patch,
    updatedAt: nowIso(),
    syncStatus: 'PENDING',
  });

  /** Replaces record `id` with `fn(record)`; returning null leaves it alone. */
  const change = (id: string, fn: (record: T) => T | null): void => {
    let changed: T | null = null;
    set((s) => {
      const list = listOf(s);
      const index = list.findIndex((r) => r.id === id);
      const next = index === -1 ? null : fn(list[index]);
      if (!next) return {};
      changed = next;
      const copy = list.slice();
      copy[index] = next;
      return { ...withList(copy), ...practicalPatch(s, kind.cashEvents(list[index]), kind.cashEvents(next)) };
    });
    const saved: T | null = changed;
    if (saved) withDb((db) => kind.save(db, saved));
  };

  return {
    stamp,
    change,
    /** Puts a new record first; `extra` goes into the same state update. */
    add: (record: T, extra: Partial<DataState> = {}): void => {
      set((s) => ({
        ...withList([record, ...listOf(s)]),
        ...extra,
        ...practicalPatch(s, [], kind.cashEvents(record)),
      }));
      withDb((db) => kind.save(db, record));
    },
    update: (id: string, patch: Partial<T>): void => change(id, (r) => stamp(r, patch)),
    remove: (id: string): void =>
      change(id, (r) => (r.isDeleted ? null : stamp(r, { isDeleted: true, deletedAt: nowIso() } as Partial<T>))),
    restore: (id: string): void =>
      change(id, (r) => (r.isDeleted ? stamp(r, { isDeleted: false, deletedAt: null } as Partial<T>) : null)),
  };
}
