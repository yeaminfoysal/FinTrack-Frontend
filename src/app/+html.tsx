/**
 * HTML shell for the web build (static render only — native never sees this).
 * Paints the backdrop on <body> so the area beside the phone-width column, and
 * any overscroll past it, matches the app instead of flashing white.
 */
import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

import { darkTokens, darken, lightTokens } from '@/constants/tokens';

// Same values AppFrame computes, so the column and the page never disagree.
const backdrop = {
  light: darken(lightTokens.bg, 0.08),
  dark: darken(darkTokens.bg, 0.45),
};

// Theme isn't persisted on web (no SQLite), so the app always follows the
// system scheme — which is exactly what this media query matches.
const backdropCss = `
body { background-color: ${backdrop.light}; }
@media (prefers-color-scheme: dark) {
  body { background-color: ${backdrop.dark}; }
}
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="bn">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        {/* Lets the app's own ScrollViews scroll instead of the document body. */}
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: backdropCss }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
