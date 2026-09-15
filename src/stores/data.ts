/**
 * Central offline-first data store. Zustand arrays are the reactive source the UI reads;
 * every write is mirrored to SQLite (source of truth) as PENDING. If SQLite is unavailable
 * the store still runs in memory (web keeps a localStorage snapshot).
 *
 * The state and actions come from the feature slices in src/features/ — this file only
 * puts them together, so screens keep importing useDataStore from here.
 */
import { create } from 'zustand';

import { createAccountSlice } from '@/features/account/account-slice';
import { createPracticalSlice } from '@/features/balance/practical-slice';
import type { DataState } from '@/features/data-state';
import { createExpenseSlice } from '@/features/expense/expense-slice';
import { createIncomeSlice } from '@/features/income/income-slice';
import { createLoanSlice } from '@/features/loan/loan-slice';
import { createProfileSlice } from '@/features/profile/profile-slice';
import { saveWebSnapshots } from '@/features/storage/web-snapshot';
import { closeMonthsOnChange, createMonthCloseSlice } from '@/features/summary/month-close';

export const useDataStore = create<DataState>()((...a) => ({
  ...createAccountSlice(...a),
  ...createIncomeSlice(...a),
  ...createExpenseSlice(...a),
  ...createLoanSlice(...a),
  ...createPracticalSlice(...a),
  ...createProfileSlice(...a),
  ...createMonthCloseSlice(...a),
}));

closeMonthsOnChange(useDataStore);
saveWebSnapshots(useDataStore);

export { DEMO_OWNER, type AddExpenseInput, type AddIncomeInput, type AddLoanInput } from '@/features/data-state';
export { countPending } from '@/features/sync/pending';
