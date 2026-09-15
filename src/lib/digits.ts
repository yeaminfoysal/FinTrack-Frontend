/**
 * Every number the user sees (amounts, dates, counts) goes through localDigits so
 * the whole app uses one numeral system. Latin digits match the prototype's money
 * format; set DIGIT_STYLE to 'bengali' to show ০–৯ everywhere instead.
 */
export const DIGIT_STYLE = 'latin' as 'latin' | 'bengali';

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function localDigits(input: string | number): string {
  const text = String(input);
  return DIGIT_STYLE === 'bengali' ? text.replace(/[0-9]/g, (d) => BENGALI_DIGITS[Number(d)]) : text;
}

/** Bengali digits typed on a Bangla keyboard → Latin, so inputs parse either way. */
export function toLatinDigits(input: string): string {
  return input.replace(/[০-৯]/g, (d) => String(BENGALI_DIGITS.indexOf(d)));
}
