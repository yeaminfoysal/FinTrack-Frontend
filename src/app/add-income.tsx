import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { IncomeForm } from '@/components/forms/income-form';
import { ModalShell, useCloseModal } from '@/components/modal-shell';
import { EmptyState } from '@/components/ui/empty-state';
import { useDataStore } from '@/stores/data';

export default function IncomeScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const close = useCloseModal();
  // Opened with ?id=… from a list → edit that entry. Snapshot it once so the form
  // doesn't flip to "not found" while the modal closes after a delete.
  const [existing] = useState(() =>
    id ? useDataStore.getState().incomes.find((i) => i.id === id && !i.isDeleted) : undefined,
  );

  if (id && !existing) {
    return (
      <ModalShell title="আয় এডিট করুন">
        <EmptyState icon="alert-circle-outline" title="এই আয়টি আর নেই" message="হয়তো আগেই ডিলিট হয়ে গেছে।" />
      </ModalShell>
    );
  }

  return (
    <ModalShell title={existing ? 'আয় এডিট করুন' : 'আয় যোগ করুন'}>
      <IncomeForm existing={existing} onDone={close} />
    </ModalShell>
  );
}
