import type { DataSlice, LoanActions } from '@/features/data-state';
import { recordActions } from '@/features/records/record-actions';
import { loanCashEvents } from '@/lib/calc/practical';
import { upsertLoan } from '@/lib/db/repo';
import { newBase, nowIso } from '@/lib/records';
import type { Loan } from '@/lib/types';

export const createLoanSlice: DataSlice<LoanActions> = (set) => {
  const loans = recordActions<Loan>(set, { list: 'loans', save: upsertLoan, cashEvents: loanCashEvents });

  return {
    addLoan: (input) => {
      const rec: Loan = {
        ...newBase(),
        direction: input.direction,
        personName: input.personName,
        amount: input.amount,
        date: input.date ?? nowIso(),
        note: input.note ?? null,
        status: 'ACTIVE',
        settledDate: null,
      };
      loans.add(rec);
      return rec.id;
    },
    updateLoan: loans.update,
    // The money comes back (or goes out) in the month it's settled, not the month of the loan.
    settleLoan: (id, settledDate) =>
      loans.change(id, (l) =>
        l.status === 'ACTIVE' ? loans.stamp(l, { status: 'SETTLED', settledDate: settledDate ?? nowIso() }) : null,
      ),
    unsettleLoan: (id) =>
      loans.change(id, (l) => (l.status === 'SETTLED' ? loans.stamp(l, { status: 'ACTIVE', settledDate: null }) : null)),
    deleteLoan: loans.remove,
    restoreLoan: loans.restore,
  };
};
