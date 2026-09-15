/** Typed endpoint helpers. UI reads from SQLite; these feed the sync layer/auth. */
import { api } from '@/lib/api/client';
import type { Expense, Income, Loan, MonthlySummary, PracticalBalance } from '@/lib/types';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name?: string; openingSavings?: number };
}

export const AuthApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }).then((r) => r.data),
  register: (payload: { email: string; password: string; name?: string; openingSavings?: number }) =>
    api.post<AuthResponse>('/auth/register', payload).then((r) => r.data),
  /** Emails a 6-digit reset code. Always succeeds for a valid email (doesn't reveal accounts). */
  forgotPassword: (email: string) =>
    api.post<{ success: boolean }>('/auth/forgot-password', { email }).then((r) => r.data),
  /** Exchanges the emailed code for a short-lived token used by resetPassword. */
  verifyResetCode: (email: string, code: string) =>
    api.post<{ resetToken: string }>('/auth/verify-reset-code', { email, code }).then((r) => r.data),
  resetPassword: (token: string, password: string) =>
    api.post<{ success: boolean }>('/auth/reset-password', { token, password }).then((r) => r.data),
  /** Revokes the refresh token on the server. Short timeout so signing out never hangs offline. */
  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }, { timeout: 5000 }).then((r) => r.data),
};

export const UsersApi = {
  me: () => api.get('/users/me').then((r) => r.data),
  updateName: (name: string) => api.patch('/users/me', { name }).then((r) => r.data),
  updateSettings: (settings: { currency?: string; timezone?: string; openingSavings?: number }) =>
    api.patch('/users/me/settings', settings).then((r) => r.data),
};

/** A record as it goes to the server: no syncStatus and no null fields (the DTOs reject both). */
export type OutgoingRecord<T> = Partial<Omit<T, 'syncStatus'>>;

export interface SyncPushPayload {
  incomes?: OutgoingRecord<Income>[];
  expenses?: OutgoingRecord<Expense>[];
  loans?: OutgoingRecord<Loan>[];
  monthlySummaries?: OutgoingRecord<MonthlySummary>[];
  practicalBalances?: OutgoingRecord<PracticalBalance>[];
}

/** Rows the server wrote after the cursor, as sent — the sync store normalizes them. */
export interface SyncPullResponse {
  serverTime: string;
  incomes?: Record<string, unknown>[];
  expenses?: Record<string, unknown>[];
  loans?: Record<string, unknown>[];
  monthlySummaries?: Record<string, unknown>[];
  practicalBalances?: Record<string, unknown>[];
}

export const SyncApi = {
  push: (payload: SyncPushPayload) =>
    api.post<{ serverTime: string }>('/sync/push', payload).then((r) => r.data),
  pull: (since?: string) =>
    api.get<SyncPullResponse>('/sync/pull', { params: since ? { since } : {} }).then((r) => r.data),
};

export const HealthApi = {
  check: () => api.get('/health').then((r) => r.data),
};
