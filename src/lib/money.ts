/**
 * Money helpers. All monetary values are integer paisa (taka × 100).
 * Never do float math on amounts; only divide by 100 for display.
 *
 * Display format follows FinTrackPrototype.html: comma grouped, "৳ " prefix, no
 * decimals when whole (e.g. "৳ 77,500"; "৳ 1,250.50"). Digits go through
 * localDigits so the whole app shows one numeral system.
 */
import { localDigits, toLatinDigits } from '@/lib/digits';

/** Format integer paisa for display: "৳ 1,250.50" (drops .00 when whole). */
export function formatTaka(paisa: number): string {
  return `${paisa < 0 ? '−' : ''}৳ ${formatAmount(paisa)}`;
}

/** Amount only, no ৳ prefix — for cases where the symbol is placed separately. */
export function formatAmount(paisa: number): string {
  const abs = Math.abs(Math.round(paisa));
  const taka = Math.floor(abs / 100);
  const remainder = abs % 100;
  const grouped = taka.toLocaleString('en-US');
  return localDigits(remainder === 0 ? grouped : `${grouped}.${String(remainder).padStart(2, '0')}`);
}

/** Signed display used in lists: "+ ৳ 55,000" / "− ৳ 4,200". */
export function formatTakaSigned(paisa: number): string {
  const sign = paisa < 0 ? '− ' : '+ ';
  return `${sign}৳ ${formatAmount(paisa)}`;
}

/** Parse a user-entered taka string/number into integer paisa. */
export function toPaisa(taka: number | string): number {
  const n = typeof taka === 'string' ? parseFloat(toLatinDigits(taka).replace(/,/g, '')) : taka;
  if (!isFinite(n)) return 0;
  return Math.round(n * 100);
}

/** Paisa -> plain taka number (for prefilling inputs). */
export function toTaka(paisa: number): number {
  return paisa / 100;
}

/** Prefill text for an amount input: 125050 → "1250.5". */
export function amountInputFromPaisa(paisa: number): string {
  return String(toTaka(paisa));
}

/**
 * Cleans what the user types into an amount field: Bangla digits become Latin,
 * only one decimal point with at most two decimals is kept, leading zeros go.
 */
export function sanitizeAmountInput(text: string): string {
  let value = toLatinDigits(text).replace(/[^0-9.]/g, '');
  const dot = value.indexOf('.');
  if (dot !== -1) value = value.slice(0, dot + 1) + value.slice(dot + 1).replace(/\./g, '').slice(0, 2);
  value = value.replace(/^0+(?=\d)/, '');
  return value.slice(0, 12);
}
