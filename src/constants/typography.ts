/**
 * Type scale — the only font sizes the app uses. Pick a size by role, not by pixel:
 *
 * - `xs` badges, tab labels, chart axis
 * - `sm` secondary text, subtitles, form labels
 * - `md` body text, list titles, small buttons
 * - `lg` section titles, buttons, inputs
 * - `xl` screen titles, card figures
 * - `display` hero amounts
 */
export const textSize = { xs: 12, sm: 13, md: 14, lg: 16, xl: 20, display: 32 } as const;

export type TextSize = keyof typeof textSize;
