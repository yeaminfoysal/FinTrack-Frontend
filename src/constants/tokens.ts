/**
 * FinTrack design tokens — mirrored 1:1 from FinTrackPrototype.html.
 * Colors are applied via inline style (the prototype is inline-style based)
 * so the light/dark theme can switch instantly at runtime. Layout still uses
 * NativeWind className where convenient.
 */

export type ThemeTokens = {
  bg: string;
  surface: string;
  surface2: string;
  ink: string;
  muted: string;
  line: string;
  primary: string;
  primary2: string;
  onPrimary: string;
  income: string;
  expense: string;
  lent: string;
  borrowed: string;
  chip: string;
};

export const lightTokens: ThemeTokens = {
  bg: '#F1F4EF',
  surface: '#FFFFFF',
  surface2: '#F6F8F3',
  ink: '#13211A',
  muted: '#647067',
  line: 'rgba(16,40,28,0.09)',
  primary: '#0E7A52',
  primary2: '#10976A',
  onPrimary: '#EAFBF1',
  income: '#138A57',
  expense: '#D9533B',
  lent: '#2C6BE0',
  borrowed: '#C77A1E',
  chip: '#EAF2EC',
};

export const darkTokens: ThemeTokens = {
  bg: '#0A120E',
  surface: '#121E18',
  surface2: '#172620',
  ink: '#EAF2EC',
  muted: '#8A9C92',
  line: 'rgba(255,255,255,0.08)',
  primary: '#19A06B',
  primary2: '#22B978',
  onPrimary: '#EAFBF1',
  income: '#34C98A',
  expense: '#FF7E63',
  lent: '#5E94F7',
  borrowed: '#E0A94E',
  chip: '#16241D',
};

export type ThemeMode = 'light' | 'dark';

export const themes: Record<ThemeMode, ThemeTokens> = {
  light: lightTokens,
  dark: darkTokens,
};

/** Convert a #RRGGBB hex to an rgba() string with the given alpha. */
export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Darken a #RRGGBB hex by mixing toward black (mimics CSS color-mix). */
export function darken(hex: string, pctBlack: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const mix = (c: number) => Math.round(c * (1 - pctBlack));
  const r = mix(parseInt(clean.slice(0, 2), 16));
  const g = mix(parseInt(clean.slice(2, 4), 16));
  const b = mix(parseInt(clean.slice(4, 6), 16));
  const to2 = (n: number) => n.toString(16).padStart(2, '0');
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

export const radii = { sm: 10, md: 14, lg: 16, xl: 22, pill: 999 } as const;
