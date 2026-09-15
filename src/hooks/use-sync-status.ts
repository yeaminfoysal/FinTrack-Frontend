import type { IconName } from '@/components/ui/icon';
import { localDigits } from '@/lib/digits';
import { countPending, DEMO_OWNER, useDataStore } from '@/stores/data';
import { useSyncStore } from '@/stores/sync';

export type SyncTone = 'ok' | 'busy' | 'pending' | 'offline' | 'error' | 'demo';

export interface SyncStatusView {
  tone: SyncTone;
  label: string;
  icon: IconName;
  /** Records not yet confirmed by the server. */
  pending: number;
  lastSyncedAt: string | null;
  isDemo: boolean;
  isSyncing: boolean;
  syncNow: () => Promise<void>;
}

/** What the sync badge shows — derived from the real sync state, never assumed. */
export function useSyncStatus(): SyncStatusView {
  const phase = useSyncStore((s) => s.status);
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);
  const syncNow = useSyncStore((s) => s.syncNow);
  const isDemo = useDataStore((s) => s.ownerEmail === DEMO_OWNER);
  const pending = useDataStore(countPending);
  const left = `${localDigits(pending)}টি বাকি`;

  let tone: SyncTone;
  let label: string;
  let icon: IconName;
  if (isDemo) {
    tone = 'demo';
    label = 'ডেমো মোড';
    icon = 'flask-outline';
  } else if (isSyncing) {
    tone = 'busy';
    label = 'সিঙ্ক হচ্ছে…';
    icon = 'sync-outline';
  } else if (phase === 'offline') {
    tone = 'offline';
    label = pending > 0 ? `অফলাইন · ${left}` : 'অফলাইন';
    icon = 'cloud-offline-outline';
  } else if (phase === 'error') {
    tone = 'error';
    label = pending > 0 ? `সিঙ্ক হয়নি · ${left}` : 'সিঙ্ক হয়নি';
    icon = 'alert-circle-outline';
  } else if (pending > 0) {
    tone = 'pending';
    label = `${localDigits(pending)}টি সিঙ্ক বাকি`;
    icon = 'cloud-upload-outline';
  } else if (!lastSyncedAt) {
    tone = 'pending';
    label = 'এখনো সিঙ্ক হয়নি';
    icon = 'cloud-upload-outline';
  } else {
    tone = 'ok';
    label = 'সিঙ্ক হয়েছে';
    icon = 'cloud-done-outline';
  }

  return { tone, label, icon, pending, lastSyncedAt, isDemo, isSyncing, syncNow };
}
