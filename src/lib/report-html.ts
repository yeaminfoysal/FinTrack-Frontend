/**
 * Monthly report as a self-contained HTML document for expo-print (HTML → PDF).
 * Pure: takes the month's computed snapshot plus raw records and returns a string,
 * so it can be tested without a device. Always rendered in the light palette.
 */
import { categoryMeta, INCOME_SOURCES } from '@/constants/categories';
import { lightTokens as t } from '@/constants/tokens';
import { dailyExpenses, type DashboardSnapshot } from '@/lib/calc';
import { dayMonthBn, fullDateBn, isInMonth, monthLabelBn, toBnDigits, weekdayBn, type MonthKey } from '@/lib/date';
import { formatTaka } from '@/lib/money';
import type { Expense, Income, Loan } from '@/lib/types';

export interface MonthReportInput {
  monthKey: MonthKey;
  snapshot: DashboardSnapshot;
  incomes: Income[];
  expenses: Expense[];
  loans: Loan[];
  userName: string;
  generatedAt?: Date;
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPES[c]);

const byDateAsc = <T extends { date: string; createdAt: string }>(a: T, b: T) =>
  a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);

function row(label: string, value: string, opts: { color?: string; strong?: boolean } = {}): string {
  const style = `${opts.color ? `color:${opts.color};` : ''}${opts.strong ? 'font-weight:700;' : ''}`;
  return `<tr${opts.strong ? ' class="total"' : ''}><td>${label}</td><td class="num" style="${style}">${value}</td></tr>`;
}

export function buildMonthReportHtml(input: MonthReportInput): string {
  const { monthKey, snapshot: s } = input;
  const closing = s.opening + s.saving;
  const monthName = monthLabelBn(monthKey);

  const incomes = input.incomes.filter((i) => !i.isDeleted && isInMonth(i.date, monthKey)).sort(byDateAsc);
  const days = dailyExpenses(input.expenses, monthKey).reverse(); // oldest day first reads naturally on paper
  const loans = input.loans.filter((l) => !l.isDeleted && isInMonth(l.date, monthKey)).sort(byDateAsc);

  const categoryTotals = new Map<string, number>();
  for (const d of days) for (const e of d.items) categoryTotals.set(e.category, (categoryTotals.get(e.category) ?? 0) + e.amount);
  const categories = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1]);

  const untrackedLabel = s.untracked < 0 ? 'আনট্র্যাকড আয়' : 'আনট্র্যাকড খরচ';
  const practicalNote = s.practical == null ? ' <span class="muted">(ব্যালেন্স ইনপুট দেওয়া হয়নি)</span>' : '';

  const summaryTable = [
    row('ওপেনিং ব্যালেন্স', formatTaka(s.opening)),
    row('মোট আয়', `+ ${formatTaka(s.monthIncome)}`, { color: t.income }),
    row('মোট খরচ (Daily)', `− ${formatTaka(s.monthDailyExpense)}`, { color: t.expense }),
    row(untrackedLabel + practicalNote, formatTaka(Math.abs(s.untracked)), { color: s.untracked < 0 ? t.income : t.borrowed }),
    row('মাসের সঞ্চয়', formatTaka(s.saving), { color: s.saving < 0 ? t.expense : t.income, strong: true }),
    row('ক্লোজিং ব্যালেন্স', formatTaka(closing), { strong: true }),
  ].join('');

  const positionTable = [
    row('পাওনা (Outstanding Lent)', formatTaka(s.outstandingLent), { color: t.lent }),
    row('দেনা (Outstanding Borrowed)', formatTaka(s.outstandingBorrowed), { color: t.borrowed }),
    s.practical != null ? row('প্র্যাকটিক্যাল ব্যালেন্স (হাতে আছে)', formatTaka(s.practical)) : '',
    row('নেট ওয়ার্থ', formatTaka(s.netWorth), { strong: true }),
  ].join('');

  const categoryRows = categories
    .map(([key, amount]) => {
      const meta = categoryMeta(key);
      const pct = s.monthDailyExpense > 0 ? Math.round((amount / s.monthDailyExpense) * 100) : 0;
      return `<tr><td>${meta.icon} ${esc(meta.label)}</td><td class="bar"><span style="width:${pct}%"></span></td><td class="num">${toBnDigits(pct)}%</td><td class="num">${formatTaka(amount)}</td></tr>`;
    })
    .join('');

  const incomeRows = incomes
    .map((i) => {
      const src = INCOME_SOURCES.find((x) => x.key === i.source);
      return `<tr><td class="date">${dayMonthBn(i.date)}</td><td>${src ? `${src.icon} ${esc(src.label)}` : esc(i.source)}</td><td>${esc(i.note ?? '')}</td><td class="num" style="color:${t.income}">${formatTaka(i.amount)}</td></tr>`;
    })
    .join('');

  const dayRows = days
    .map((d) => {
      const date = d.items[0].date;
      const items = d.items
        .map((e) => {
          const meta = categoryMeta(e.category);
          return `<tr class="item"><td></td><td>${meta.icon} ${esc(meta.label)}</td><td>${esc(e.description ?? '')}</td><td class="num">${formatTaka(e.amount)}</td></tr>`;
        })
        .join('');
      return `<tbody class="day"><tr class="day-head"><td class="date">${dayMonthBn(date)}</td><td colspan="2">${weekdayBn(date)} · ${toBnDigits(d.items.length)}টি খরচ</td><td class="num" style="color:${t.expense}">${formatTaka(d.total)}</td></tr>${items}</tbody>`;
    })
    .join('');

  const loanRows = loans
    .map((l) => {
      const lent = l.direction === 'LENT';
      const status =
        l.status === 'ACTIVE' ? 'বাকি' : `${lent ? 'ফেরত পেয়েছি' : 'ফেরত দিয়েছি'}${l.settledDate ? ` · ${dayMonthBn(l.settledDate)}` : ''}`;
      return `<tr><td class="date">${dayMonthBn(l.date)}</td><td style="color:${lent ? t.lent : t.borrowed}">${lent ? 'ধার দেওয়া' : 'ধার নেওয়া'}</td><td>${esc(l.personName)}${l.note ? ` <span class="muted">— ${esc(l.note)}</span>` : ''}</td><td>${status}</td><td class="num">${formatTaka(l.amount)}</td></tr>`;
    })
    .join('');

  const empty = (text: string, cols: number) => `<tr><td colspan="${cols}" class="muted empty">${text}</td></tr>`;
  const generated = input.generatedAt ?? new Date();

  return `<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light only" />
<title>FinTrack — ${monthName}</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  /* Paper is always white — a device in dark mode must not darken the PDF. */
  :root { color-scheme: light only; }
  html, body { background: #ffffff; }
  body { margin: 0; color: ${t.ink}; font-family: 'Noto Sans Bengali', 'Hind Siliguri', 'Bangla Sangam MN', sans-serif; font-size: 11.5px; line-height: 1.45; }
  h1 { font-size: 20px; margin: 0; color: ${t.primary}; }
  h2 { font-size: 13.5px; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 2px solid ${t.primary}; }
  .muted { color: ${t.muted}; font-weight: 400; }
  .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1px solid #dfe5dc; padding-bottom: 10px; }
  .header .month { font-size: 15px; font-weight: 700; }
  .cards { display: flex; gap: 10px; margin-top: 14px; }
  .card { flex: 1; border: 1px solid #dfe5dc; border-radius: 10px; padding: 10px 12px; }
  .card .label { font-size: 10.5px; color: ${t.muted}; }
  .card .value { font-size: 17px; font-weight: 700; margin-top: 2px; }
  .card.saving { background: ${t.primary}; border-color: ${t.primary}; }
  .card.saving .label, .card.saving .value { color: #ffffff; }
  .two { display: flex; gap: 14px; }
  .two > div { flex: 1; }
  table { width: 100%; border-collapse: collapse; }
  td, th { padding: 5px 6px; border-bottom: 1px solid #e8ece6; vertical-align: top; text-align: left; }
  th { font-size: 10.5px; color: ${t.muted}; font-weight: 600; background: ${t.surface2}; }
  .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .date { white-space: nowrap; width: 72px; }
  tr.total td { background: ${t.surface2}; }
  tr { page-break-inside: avoid; }
  tbody.day { page-break-inside: avoid; }
  tr.day-head td { background: ${t.chip}; font-weight: 600; border-top: 1px solid #d5dfd6; }
  tr.item td { font-size: 11px; }
  td.bar { width: 34%; }
  td.bar span { display: block; height: 7px; border-radius: 4px; background: ${t.expense}; min-width: 2px; }
  .empty { text-align: center; padding: 10px; }
  .formula { margin-top: 6px; font-size: 10.5px; color: ${t.muted}; }
  .footer { margin-top: 22px; font-size: 10px; color: ${t.muted}; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>FinTrack</h1>
      <div class="muted">মাসিক রিপোর্ট · ${esc(input.userName)}</div>
    </div>
    <div style="text-align:right">
      <div class="month">${monthName}</div>
      <div class="muted">তৈরি: ${fullDateBn(generated.toISOString())}</div>
    </div>
  </div>

  <div class="cards">
    <div class="card"><div class="label">মোট আয়</div><div class="value" style="color:${t.income}">${formatTaka(s.monthIncome)}</div></div>
    <div class="card"><div class="label">মোট খরচ</div><div class="value" style="color:${t.expense}">${formatTaka(s.monthDailyExpense)}</div></div>
    <div class="card saving"><div class="label">মাসের সঞ্চয়</div><div class="value">${formatTaka(s.saving)}</div></div>
  </div>

  <div class="two">
    <div>
      <h2>হিসাবের সারসংক্ষেপ</h2>
      <table>${summaryTable}</table>
      <div class="formula">সঞ্চয় = আয় − (খরচ + আনট্র্যাকড) · ক্লোজিং = ওপেনিং + সঞ্চয়</div>
    </div>
    <div>
      <h2>সম্পদ ও দায়</h2>
      <table>${positionTable}</table>
    </div>
  </div>

  <h2>ক্যাটাগরি অনুযায়ী খরচ</h2>
  <table>${categoryRows || empty('এই মাসে কোনো খরচ নেই', 4)}</table>

  <h2>আয়ের তালিকা</h2>
  <table>
    <tr><th>তারিখ</th><th>উৎস</th><th>নোট</th><th class="num">টাকা</th></tr>
    ${incomeRows || empty('এই মাসে কোনো আয় নেই', 4)}
    ${incomes.length ? row('<b>মোট আয়</b>', formatTaka(s.monthIncome), { color: t.income, strong: true }).replace('<td>', '<td colspan="3">') : ''}
  </table>

  <h2>দিনভিত্তিক খরচ</h2>
  <table>
    <tr><th>তারিখ</th><th>ক্যাটাগরি</th><th>বিবরণ</th><th class="num">টাকা</th></tr>
    ${dayRows || empty('এই মাসে কোনো খরচ নেই', 4)}
    ${days.length ? row('<b>মোট খরচ</b>', formatTaka(s.monthDailyExpense), { color: t.expense, strong: true }).replace('<td>', '<td colspan="3">') : ''}
  </table>

  <h2>এই মাসের লোন</h2>
  <table>
    <tr><th>তারিখ</th><th>ধরন</th><th>ব্যক্তি</th><th>অবস্থা</th><th class="num">টাকা</th></tr>
    ${loanRows || empty('এই মাসে কোনো লোন নেই', 5)}
  </table>

  <div class="footer">সব টাকা বাংলাদেশি টাকায় (৳) · FinTrack থেকে তৈরি</div>
</body>
</html>`;
}
