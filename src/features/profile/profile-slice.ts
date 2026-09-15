import type { DataSlice, ProfileActions } from '@/features/data-state';
import { requestSync, withDb, writeMeta } from '@/features/storage/persist';
import { setMeta } from '@/lib/db/repo';

export const createProfileSlice: DataSlice<ProfileActions> = (set, get) => ({
  updateProfile: (patch) => {
    const next = { ...get().profile, ...patch };
    set({ profile: next });
    withDb((db) => setMeta(db, 'profile', JSON.stringify(next)));
  },

  editProfile: (patch) => {
    const next = { ...get().profile, ...patch };
    set({ profile: next, profileDirty: true });
    writeMeta('profile', JSON.stringify(next));
    writeMeta('profileDirty', '1');
    requestSync();
  },

  markProfileSynced: () => {
    set({ profileDirty: false });
    writeMeta('profileDirty', '0');
  },
});
