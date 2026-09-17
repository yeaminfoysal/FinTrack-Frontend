import type { AddLoanPaymentInput, DataSlice, LoanActions } from '@/features/data-state';
import { recordActions } from '@/features/records/record-actions';
import { loanOutstanding } from '@/lib/calc';
import { loanCashEvents, loanPaymentCashEvents } from '@/lib/calc/practical';
import { upsertLoan, upsertLoanPayment } from '@/lib/db/repo';
import { newBase, nowIso } from '@/lib/records';
import type { Loan, LoanPayment } from '@/lib/types';

export const createLoanSlice: DataSlice<LoanActions> = (set, get) => {
  const loans = recordActions<Loan>(set, { list: 'loans', save: upsertLoan, cashEvents: loanCashEvents });
  const payments = recordActions<LoanPayment>(set, {
    list: 'loanPayments',
    save: upsertLoanPayment,
    // Which way the money moves is the loan's, not the payment's: a returned loan brings cash in.
    cashEvents: (payment, s) => {
      const loan = s.loans.find((l) => l.id === payment.loanId);
      return loan ? loanPaymentCashEvents(payment, loan.direction) : [];
    },
  });

  const addPayment = (input: AddLoanPaymentInput): string => {
    const rec: LoanPayment = {
      ...newBase(),
      loanId: input.loanId,
      amount: input.amount,
      date: input.date ?? nowIso(),
      note: input.note ?? null,
    };
    payments.add(rec);
    return rec.id;
  };

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
        dueDate: input.dueDate ?? null,
      };
      loans.add(rec);
      return rec.id;
    },
    updateLoan: loans.update,

    // Settling is just a repayment for everything still owed, so a loan paid off at once
    // and one paid off bit by bit end up with the same history.
    settleLoan: (id, settledDate) => {
      const s = get();
      const loan = s.loans.find((l) => l.id === id && !l.isDeleted);
      if (!loan) return null;
      const remaining = loanOutstanding(loan, s.loanPayments);
      if (remaining <= 0) return null;
      return addPayment({ loanId: id, amount: remaining, date: settledDate });
    },
    unsettleLoan: (id) =>
      loans.change(id, (l) => (l.status === 'SETTLED' ? loans.stamp(l, { status: 'ACTIVE', settledDate: null }) : null)),

    // A loan's repayments go with it, stamped at the same instant so a restore finds
    // exactly those again and leaves ones deleted separately alone.
    deleteLoan: (id) => {
      const loan = get().loans.find((l) => l.id === id);
      if (!loan || loan.isDeleted) return;
      const deletedAt = nowIso();
      for (const p of get().loanPayments) {
        if (p.loanId === id && !p.isDeleted) payments.change(p.id, (r) => payments.stamp(r, { isDeleted: true, deletedAt }));
      }
      loans.change(id, (l) => loans.stamp(l, { isDeleted: true, deletedAt }));
    },
    restoreLoan: (id) => {
      const loan = get().loans.find((l) => l.id === id);
      if (!loan || !loan.isDeleted) return;
      const { deletedAt } = loan;
      loans.change(id, (l) => loans.stamp(l, { isDeleted: false, deletedAt: null }));
      for (const p of get().loanPayments) {
        if (p.loanId === id && p.isDeleted && p.deletedAt === deletedAt) {
          payments.change(p.id, (r) => payments.stamp(r, { isDeleted: false, deletedAt: null }));
        }
      }
    },

    addLoanPayment: addPayment,
    deleteLoanPayment: payments.remove,
    restoreLoanPayment: payments.restore,
  };
};
