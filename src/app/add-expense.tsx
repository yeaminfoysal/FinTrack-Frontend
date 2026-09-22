import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { ExpenseForm } from '@/components/forms/expense-form';
import { ModalShell, useCloseModal } from '@/components/modal-shell';
import { PageTitle } from '@/components/page-title';
import { EmptyState } from '@/components/ui/empty-state';
import { useStrings } from '@/lib/i18n';
import { useDataStore } from '@/stores/data';

export default function ExpenseScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const strings = useStrings();
  const t = strings.addScreen;
  const close = useCloseModal();
  // Opened with ?id=… from a list → edit that entry. Snapshot it once so the form
  // doesn't flip to "not found" while the modal closes after a delete.
  const [existing] = useState(() =>
    id ? useDataStore.getState().expenses.find((e) => e.id === id && !e.isDeleted) : undefined,
  );

  if (id && !existing) {
    return (
      <ModalShell title={t.expenseEditTitle}>
        <PageTitle title={t.expensePageTitle} />
        <EmptyState icon="alert-circle-outline" title={t.expenseGone} message={strings.common.gone} />
      </ModalShell>
    );
  }

  return (
    <ModalShell title={existing ? t.expenseEditTitle : t.expenseTitle}>
      <PageTitle title={t.expensePageTitle} />
      <ExpenseForm existing={existing} onDone={close} />
    </ModalShell>
  );
}
