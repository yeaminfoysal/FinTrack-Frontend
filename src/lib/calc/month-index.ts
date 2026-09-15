/**
 * Records grouped by local month, built once per array. The data store replaces a record
 * array on every change and never mutates one, so the array itself is the cache key: month
 * totals, the month-close chain and the lists stop re-scanning every record each time.
 */
import { monthKeyOf, type MonthKey } from '@/lib/date';

type Dated = { date: string; isDeleted?: boolean };

const cache = new WeakMap<readonly Dated[], Map<MonthKey, Dated[]>>();

/** Live (not deleted) rows per month, each month in the array's own order. */
export function byMonth<T extends Dated>(rows: readonly T[]): ReadonlyMap<MonthKey, readonly T[]> {
  let index = cache.get(rows);
  if (!index) {
    index = new Map();
    for (const row of rows) {
      if (row.isDeleted) continue;
      const key = monthKeyOf(new Date(row.date));
      const list = index.get(key);
      if (list) list.push(row);
      else index.set(key, [row]);
    }
    cache.set(rows, index);
  }
  return index as Map<MonthKey, T[]>;
}

/** Live rows of one month. */
export function rowsInMonth<T extends Dated>(rows: readonly T[], key: MonthKey): readonly T[] {
  return byMonth(rows).get(key) ?? [];
}
