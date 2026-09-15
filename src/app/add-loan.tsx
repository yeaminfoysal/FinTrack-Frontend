import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { LoanForm } from '@/components/forms/loan-form';
import { ModalShell, useCloseModal } from '@/components/modal-shell';
import { EmptyState } from '@/components/ui/empty-state';
import { useDataStore } from '@/stores/data';

export default function LoanScreen() {
  const { id, direction } = useLocalSearchParams<{ id?: string; direction?: string }>();
  const close = useCloseModal();
  // Opened with ?id=… from a list → edit that loan. Snapshot it once so the form
  // doesn't flip to "not found" while the modal closes after a delete.
  const [existing] = useState(() =>
    id ? useDataStore.getState().loans.find((l) => l.id === id && !l.isDeleted) : undefined,
  );

  if (id && !existing) {
    return (
      <ModalShell title="লোন এডিট করুন">
        <EmptyState icon="alert-circle-outline" title="এই লোনটি আর নেই" message="হয়তো আগেই ডিলিট হয়ে গেছে।" />
      </ModalShell>
    );
  }

  return (
    <ModalShell title={existing ? 'লোন এডিট করুন' : 'নতুন লোন'}>
      <LoanForm existing={existing} initialDirection={direction === 'BORROWED' ? 'BORROWED' : 'LENT'} onDone={close} />
    </ModalShell>
  );
}
