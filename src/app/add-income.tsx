import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { IncomeForm } from '@/components/forms/income-form';
import { ModalShell, useCloseModal } from '@/components/modal-shell';
import { PageTitle } from '@/components/page-title';
import { EmptyState } from '@/components/ui/empty-state';
import { useStrings } from '@/lib/i18n';
import { useDataStore } from '@/stores/data';

export default function IncomeScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const strings = useStrings();
  const t = strings.addScreen;
  const close = useCloseModal();
  // Opened with ?id=… from a list → edit that entry. Snapshot it once so the form
  // doesn't flip to "not found" while the modal closes after a delete.
  const [existing] = useState(() =>
    id ? useDataStore.getState().incomes.find((i) => i.id === id && !i.isDeleted) : undefined,
  );

  if (id && !existing) {
    return (
      <ModalShell title={t.incomeEditTitle}>
        <PageTitle title={t.incomePageTitle} />
        <EmptyState icon="alert-circle-outline" title={t.incomeGone} message={strings.common.gone} />
      </ModalShell>
    );
  }

  return (
    <ModalShell title={existing ? t.incomeEditTitle : t.incomeTitle}>
      <PageTitle title={t.incomePageTitle} />
      <IncomeForm existing={existing} onDone={close} />
    </ModalShell>
  );
}
