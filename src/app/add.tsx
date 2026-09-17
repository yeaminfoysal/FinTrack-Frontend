import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { ExpenseForm } from '@/components/forms/expense-form';
import { IncomeForm } from '@/components/forms/income-form';
import { LoanForm } from '@/components/forms/loan-form';
import { ModalShell, useCloseModal } from '@/components/modal-shell';
import { PageTitle } from '@/components/page-title';
import { Segmented } from '@/components/ui/segmented';

type EntryType = 'expense' | 'income' | 'loan';

const TYPE_OPTIONS: { value: EntryType; label: string }[] = [
  { value: 'expense', label: 'খরচ' },
  { value: 'income', label: 'আয়' },
  { value: 'loan', label: 'লোন' },
];

/** New entry. The "+" button lands here with the expense form open — the most frequent entry. */
export default function AddEntryScreen() {
  const params = useLocalSearchParams<{ type?: string; direction?: string }>();
  const close = useCloseModal();
  const [type, setType] = useState<EntryType>(
    params.type === 'income' || params.type === 'loan' ? params.type : 'expense',
  );

  return (
    <ModalShell title="নতুন এন্ট্রি">
      <PageTitle title="নতুন এন্ট্রি" />
      <Segmented options={TYPE_OPTIONS} value={type} onChange={setType} accessibilityLabel="এন্ট্রির ধরন" />
      {type === 'expense' ? <ExpenseForm key="expense" onDone={close} /> : null}
      {type === 'income' ? <IncomeForm key="income" onDone={close} /> : null}
      {type === 'loan' ? (
        <LoanForm key="loan" initialDirection={params.direction === 'BORROWED' ? 'BORROWED' : 'LENT'} onDone={close} />
      ) : null}
    </ModalShell>
  );
}
