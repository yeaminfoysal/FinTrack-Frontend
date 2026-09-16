/** Repositories: read/write typed records to SQLite. Soft-delete only. */
import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  Category,
  Expense,
  Income,
  Loan,
  MonthlySummary,
  PracticalBalance,
  SyncStatus,
} from '@/lib/types';

type Row = Record<string, unknown>;

const b = (v: unknown) => Number(v) === 1;

// Row mappers. A sync pull runs server records through them too, which drops
// server-only fields (userId, serverUpdatedAt) and normalizes the types.

export function toIncome(r: Row): Income {
  return {
    id: String(r.id),
    amount: Number(r.amount),
    source: String(r.source),
    date: String(r.date),
    note: (r.note as string) ?? null,
    isDeleted: b(r.isDeleted),
    deletedAt: (r.deletedAt as string) ?? null,
    syncStatus: r.syncStatus as Income['syncStatus'],
    createdAt: String(r.createdAt),
    updatedAt: String(r.updatedAt),
  };
}

export function toExpense(r: Row): Expense {
  return {
    id: String(r.id),
    amount: Number(r.amount),
    category: String(r.category),
    date: String(r.date),
    description: (r.description as string) ?? null,
    isDeleted: b(r.isDeleted),
    deletedAt: (r.deletedAt as string) ?? null,
    syncStatus: r.syncStatus as Expense['syncStatus'],
    createdAt: String(r.createdAt),
    updatedAt: String(r.updatedAt),
  };
}

export function toCategory(r: Row): Category {
  return {
    id: String(r.id),
    kind: r.kind as Category['kind'],
    label: String(r.label),
    icon: String(r.icon),
    iconName: String(r.iconName),
    isDeleted: b(r.isDeleted),
    deletedAt: (r.deletedAt as string) ?? null,
    syncStatus: r.syncStatus as Category['syncStatus'],
    createdAt: String(r.createdAt),
    updatedAt: String(r.updatedAt),
  };
}

export function toLoan(r: Row): Loan {
  return {
    id: String(r.id),
    direction: r.direction as Loan['direction'],
    personName: String(r.personName),
    amount: Number(r.amount),
    date: String(r.date),
    note: (r.note as string) ?? null,
    status: r.status as Loan['status'],
    settledDate: (r.settledDate as string) ?? null,
    isDeleted: b(r.isDeleted),
    deletedAt: (r.deletedAt as string) ?? null,
    syncStatus: r.syncStatus as Loan['syncStatus'],
    createdAt: String(r.createdAt),
    updatedAt: String(r.updatedAt),
  };
}

export function toSummary(r: Row): MonthlySummary {
  return {
    id: String(r.id),
    year: Number(r.year),
    month: Number(r.month),
    openingBalance: Number(r.openingBalance),
    totalIncome: Number(r.totalIncome),
    totalDailyExpense: Number(r.totalDailyExpense),
    outstandingLent: Number(r.outstandingLent),
    outstandingBorrowed: Number(r.outstandingBorrowed),
    untrackedExpense: Number(r.untrackedExpense),
    monthlySaving: Number(r.monthlySaving),
    closingBalance: Number(r.closingBalance),
    practicalBalance: r.practicalBalance == null ? null : Number(r.practicalBalance),
    isDeleted: b(r.isDeleted),
    deletedAt: (r.deletedAt as string) ?? null,
    syncStatus: r.syncStatus as MonthlySummary['syncStatus'],
    createdAt: String(r.createdAt),
    updatedAt: String(r.updatedAt),
  };
}

export function toPractical(r: Row): PracticalBalance {
  return {
    monthKey: String(r.monthKey),
    cash: Number(r.cash),
    bank: Number(r.bank),
    mfs: Number(r.mfs),
    amount: Number(r.amount),
    // Saved before countedAt existed: updatedAt is the closest known count time.
    countedAt: String(r.countedAt ?? r.updatedAt),
    updatedAt: String(r.updatedAt),
    syncStatus: (r.syncStatus as SyncStatus | undefined) ?? 'PENDING',
  };
}

// ---- reads ----
export function getIncomes(db: SQLiteDatabase): Income[] {
  return db.getAllSync<Row>('SELECT * FROM income ORDER BY date DESC').map(toIncome);
}
export function getExpenses(db: SQLiteDatabase): Expense[] {
  return db.getAllSync<Row>('SELECT * FROM expense ORDER BY date DESC').map(toExpense);
}
/** Oldest first, so the chips keep the order the user added them in. */
export function getCategories(db: SQLiteDatabase): Category[] {
  return db.getAllSync<Row>('SELECT * FROM category ORDER BY createdAt').map(toCategory);
}
export function getLoans(db: SQLiteDatabase): Loan[] {
  return db.getAllSync<Row>('SELECT * FROM loan ORDER BY date DESC').map(toLoan);
}
export function getSummaries(db: SQLiteDatabase): MonthlySummary[] {
  return db
    .getAllSync<Row>('SELECT * FROM monthly_summary ORDER BY year DESC, month DESC')
    .map(toSummary);
}
export function getPracticals(db: SQLiteDatabase): PracticalBalance[] {
  return db.getAllSync<Row>('SELECT * FROM practical_balance').map(toPractical);
}

export function getPendingRecords(db: SQLiteDatabase) {
  return {
    incomes: db.getAllSync<Row>("SELECT * FROM income WHERE syncStatus = 'PENDING'").map(toIncome),
    expenses: db.getAllSync<Row>("SELECT * FROM expense WHERE syncStatus = 'PENDING'").map(toExpense),
    loans: db.getAllSync<Row>("SELECT * FROM loan WHERE syncStatus = 'PENDING'").map(toLoan),
    categories: db.getAllSync<Row>("SELECT * FROM category WHERE syncStatus = 'PENDING'").map(toCategory),
    monthlySummaries: db.getAllSync<Row>("SELECT * FROM monthly_summary WHERE syncStatus = 'PENDING'").map(toSummary),
    practicalBalances: db
      .getAllSync<Row>("SELECT * FROM practical_balance WHERE syncStatus = 'PENDING'")
      .map(toPractical),
  };
}

/** A stored row's version, for the Last-Write-Wins merge of a pull. */
export type StoredVersion = { syncStatus: SyncStatus; updatedAt: string } | null;

export function getRecordVersion(
  db: SQLiteDatabase,
  table: 'income' | 'expense' | 'loan' | 'category',
  id: string,
): StoredVersion {
  return db.getFirstSync<{ syncStatus: SyncStatus; updatedAt: string }>(
    `SELECT syncStatus, updatedAt FROM ${table} WHERE id = ?`,
    [id],
  );
}

export function getSummaryVersion(db: SQLiteDatabase, year: number, month: number): StoredVersion {
  return db.getFirstSync<{ syncStatus: SyncStatus; updatedAt: string }>(
    'SELECT syncStatus, updatedAt FROM monthly_summary WHERE year = ? AND month = ?',
    [year, month],
  );
}

export function getPracticalVersion(db: SQLiteDatabase, monthKey: string): StoredVersion {
  return db.getFirstSync<{ syncStatus: SyncStatus; updatedAt: string }>(
    'SELECT syncStatus, updatedAt FROM practical_balance WHERE monthKey = ?',
    [monthKey],
  );
}

/** A record or practical balance as it went out in a push. */
export interface SentRecord {
  id: string;
  updatedAt: string;
}
export interface SentPractical {
  monthKey: string;
  updatedAt: string;
}

/**
 * Marks pushed rows SYNCED — only where updatedAt still matches what was sent, so a
 * row edited while the push was in flight stays PENDING for the next push.
 */
export function markAsSynced(
  db: SQLiteDatabase,
  sent: {
    incomes: SentRecord[];
    expenses: SentRecord[];
    loans: SentRecord[];
    summaries: SentRecord[];
    categories: SentRecord[];
    practicals: SentPractical[];
  },
) {
  db.withTransactionSync(() => {
    const mark = (table: 'income' | 'expense' | 'loan' | 'monthly_summary' | 'category', rows: SentRecord[]) => {
      for (const row of rows) {
        db.runSync(`UPDATE ${table} SET syncStatus = 'SYNCED' WHERE id = ? AND updatedAt = ?`, [row.id, row.updatedAt]);
      }
    };
    mark('income', sent.incomes);
    mark('expense', sent.expenses);
    mark('loan', sent.loans);
    mark('monthly_summary', sent.summaries);
    mark('category', sent.categories);
    for (const row of sent.practicals) {
      db.runSync("UPDATE practical_balance SET syncStatus = 'SYNCED' WHERE monthKey = ? AND updatedAt = ?", [
        row.monthKey,
        row.updatedAt,
      ]);
    }
  });
}

// ---- writes (INSERT OR REPLACE by primary key) ----
export function upsertIncome(db: SQLiteDatabase, i: Income): void {
  db.runSync(
    `INSERT OR REPLACE INTO income (id,amount,source,date,note,isDeleted,deletedAt,syncStatus,createdAt,updatedAt)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [i.id, i.amount, i.source, i.date, i.note, i.isDeleted ? 1 : 0, i.deletedAt, i.syncStatus, i.createdAt, i.updatedAt],
  );
}
export function upsertExpense(db: SQLiteDatabase, e: Expense): void {
  db.runSync(
    `INSERT OR REPLACE INTO expense (id,amount,category,date,description,isDeleted,deletedAt,syncStatus,createdAt,updatedAt)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [e.id, e.amount, e.category, e.date, e.description, e.isDeleted ? 1 : 0, e.deletedAt, e.syncStatus, e.createdAt, e.updatedAt],
  );
}
export function upsertCategory(db: SQLiteDatabase, c: Category): void {
  db.runSync(
    `INSERT OR REPLACE INTO category (id,kind,label,icon,iconName,isDeleted,deletedAt,syncStatus,createdAt,updatedAt)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [c.id, c.kind, c.label, c.icon, c.iconName, c.isDeleted ? 1 : 0, c.deletedAt, c.syncStatus, c.createdAt, c.updatedAt],
  );
}
export function upsertLoan(db: SQLiteDatabase, l: Loan): void {
  db.runSync(
    `INSERT OR REPLACE INTO loan (id,direction,personName,amount,date,note,status,settledDate,isDeleted,deletedAt,syncStatus,createdAt,updatedAt)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      l.id, l.direction, l.personName, l.amount, l.date, l.note, l.status, l.settledDate,
      l.isDeleted ? 1 : 0, l.deletedAt, l.syncStatus, l.createdAt, l.updatedAt,
    ],
  );
}
export function upsertSummary(db: SQLiteDatabase, s: MonthlySummary): void {
  db.runSync(
    `INSERT OR REPLACE INTO monthly_summary
      (id,year,month,openingBalance,totalIncome,totalDailyExpense,outstandingLent,outstandingBorrowed,untrackedExpense,monthlySaving,closingBalance,practicalBalance,isDeleted,deletedAt,syncStatus,createdAt,updatedAt)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      s.id, s.year, s.month, s.openingBalance, s.totalIncome, s.totalDailyExpense,
      s.outstandingLent, s.outstandingBorrowed, s.untrackedExpense, s.monthlySaving,
      s.closingBalance, s.practicalBalance, s.isDeleted ? 1 : 0, s.deletedAt, s.syncStatus,
      s.createdAt, s.updatedAt,
    ],
  );
}
export function upsertPractical(db: SQLiteDatabase, p: PracticalBalance): void {
  db.runSync(
    `INSERT OR REPLACE INTO practical_balance (monthKey,cash,bank,mfs,amount,countedAt,updatedAt,syncStatus)
     VALUES (?,?,?,?,?,?,?,?)`,
    [p.monthKey, p.cash, p.bank, p.mfs, p.amount, p.countedAt, p.updatedAt, p.syncStatus],
  );
}

export function getMeta(db: SQLiteDatabase, key: string): string | null {
  const row = db.getFirstSync<{ value: string }>('SELECT value FROM meta WHERE key = ?', [key]);
  return row?.value ?? null;
}
export function setMeta(db: SQLiteDatabase, key: string, value: string): void {
  db.runSync('INSERT OR REPLACE INTO meta (key,value) VALUES (?,?)', [key, value]);
}

export function countRows(db: SQLiteDatabase, table: string): number {
  const row = db.getFirstSync<{ c: number }>(`SELECT COUNT(*) as c FROM ${table}`);
  return row?.c ?? 0;
}

/** Wipe all record tables (used when switching accounts). Keeps the meta table. */
export function clearAllData(db: SQLiteDatabase): void {
  db.execSync(
    `DELETE FROM income;
     DELETE FROM expense;
     DELETE FROM loan;
     DELETE FROM monthly_summary;
     DELETE FROM practical_balance;
     DELETE FROM category;`,
  );
}
