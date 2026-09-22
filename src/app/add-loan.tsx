import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { LoanForm } from '@/components/forms/loan-form';
import { ModalShell, useCloseModal } from '@/components/modal-shell';
import { PageTitle } from '@/components/page-title';
import { EmptyState } from '@/components/ui/empty-state';
import { useStrings } from '@/lib/i18n';
import { useDataStore } from '@/stores/data';

export default function LoanScreen() {
  const { id, direction } = useLocalSearchParams<{ id?: string; direction?: string }>();
  const strings = useStrings();
  const t = strings.addScreen;
  const close = useCloseModal();
  // Opened with ?id=… from a list → edit that loan. Snapshot it once so the form
  // doesn't flip to "not found" while the modal closes after a delete.
  const [existing] = useState(() =>
    id ? useDataStore.getState().loans.find((l) => l.id === id && !l.isDeleted) : undefined,
  );

  if (id && !existing) {
    return (
      <ModalShell title={t.loanEditTitle}>
        <PageTitle title={t.loanPageTitle} />
        <EmptyState icon="alert-circle-outline" title={t.loanGone} message={strings.common.gone} />
      </ModalShell>
    );
  }

  return (
    <ModalShell title={existing ? t.loanEditTitle : t.loanTitle}>
      <PageTitle title={t.loanPageTitle} />
      <LoanForm existing={existing} initialDirection={direction === 'BORROWED' ? 'BORROWED' : 'LENT'} onDone={close} />
    </ModalShell>
  );
}
