import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { ExpenseForm } from '@/components/forms/expense-form';
import { ModalShell, useCloseModal } from '@/components/modal-shell';
import { PageTitle } from '@/components/page-title';
import { EmptyState } from '@/components/ui/empty-state';
import { useDataStore } from '@/stores/data';

export default function ExpenseScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const close = useCloseModal();
  // Opened with ?id=… from a list → edit that entry. Snapshot it once so the form
  // doesn't flip to "not found" while the modal closes after a delete.
  const [existing] = useState(() =>
    id ? useDataStore.getState().expenses.find((e) => e.id === id && !e.isDeleted) : undefined,
  );

  if (id && !existing) {
    return (
      <ModalShell title="খরচ এডিট করুন">
        <PageTitle title="খরচ যোগ" />
        <EmptyState icon="alert-circle-outline" title="এই খরচটি আর নেই" message="হয়তো আগেই ডিলিট হয়ে গেছে।" />
      </ModalShell>
    );
  }

  return (
    <ModalShell title={existing ? 'খরচ এডিট করুন' : 'খরচ যোগ করুন'}>
      <PageTitle title="খরচ যোগ" />
      <ExpenseForm existing={existing} onDone={close} />
    </ModalShell>
  );
}
