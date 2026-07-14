/**
 * Money helpers. All monetary values are integer paisa (taka × 100).
 * Never do float math on amounts; only divide by 100 for display.
 *
 * Display format follows FinTrackPrototype.html: Latin digits, comma grouped,
 * "৳ " prefix, no decimals when whole (e.g. "৳ 77,500"; "৳ 1,250.50").
 */

/** Format integer paisa for display: "৳ 1,250.50" (drops .00 when whole). */
export function formatTaka(paisa: number): string {
  const negative = paisa < 0;
  const abs = Math.abs(Math.round(paisa));
  const taka = Math.floor(abs / 100);
  const remainder = abs % 100;
  const grouped = taka.toLocaleString('en-US');
  const body = remainder === 0 ? grouped : `${grouped}.${String(remainder).padStart(2, '0')}`;
  return `${negative ? '−' : ''}৳ ${body}`;
}

/** Amount only, no ৳ prefix — for cases where the symbol is placed separately. */
export function formatAmount(paisa: number): string {
  const abs = Math.abs(Math.round(paisa));
  const taka = Math.floor(abs / 100);
  const remainder = abs % 100;
  const grouped = taka.toLocaleString('en-US');
  return remainder === 0 ? grouped : `${grouped}.${String(remainder).padStart(2, '0')}`;
}

/** Signed display used in lists: "+ ৳ 55,000" / "− ৳ 4,200". */
export function formatTakaSigned(paisa: number): string {
  const sign = paisa < 0 ? '− ' : '+ ';
  return `${sign}৳ ${formatAmount(paisa)}`;
}

/** Parse a user-entered taka string/number into integer paisa. */
export function toPaisa(taka: number | string): number {
  const n = typeof taka === 'string' ? parseFloat(taka.replace(/,/g, '')) : taka;
  if (!isFinite(n)) return 0;
  return Math.round(n * 100);
}

/** Paisa -> plain taka number (for prefilling inputs). */
export function toTaka(paisa: number): number {
  return paisa / 100;
}
