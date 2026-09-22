import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';

import { ExpenseForm } from '@/components/forms/expense-form';
import { IncomeForm } from '@/components/forms/income-form';
import { LoanForm } from '@/components/forms/loan-form';
import { ModalShell, useCloseModal } from '@/components/modal-shell';
import { PageTitle } from '@/components/page-title';
import { Segmented } from '@/components/ui/segmented';
import { useStrings } from '@/lib/i18n';

type EntryType = 'expense' | 'income' | 'loan';

/** New entry. The "+" button lands here with the expense form open — the most frequent entry. */
export default function AddEntryScreen() {
  const params = useLocalSearchParams<{ type?: string; direction?: string }>();
  const strings = useStrings();
  const t = strings.addScreen;
  const typeOptions = useMemo<{ value: EntryType; label: string }[]>(
    () => [
      { value: 'expense', label: strings.activity.expense },
      { value: 'income', label: strings.activity.income },
      { value: 'loan', label: strings.activity.loan },
    ],
    [strings],
  );
  const close = useCloseModal();
  const [type, setType] = useState<EntryType>(
    params.type === 'income' || params.type === 'loan' ? params.type : 'expense',
  );

  return (
    <ModalShell title={t.title}>
      <PageTitle title={t.title} />
      <Segmented options={typeOptions} value={type} onChange={setType} accessibilityLabel={t.typeA11y} />
      {type === 'expense' ? <ExpenseForm key="expense" onDone={close} /> : null}
      {type === 'income' ? <IncomeForm key="income" onDone={close} /> : null}
      {type === 'loan' ? (
        <LoanForm key="loan" initialDirection={params.direction === 'BORROWED' ? 'BORROWED' : 'LENT'} onDone={close} />
      ) : null}
    </ModalShell>
  );
}
