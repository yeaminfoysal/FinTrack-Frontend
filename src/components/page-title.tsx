import Head from 'expo-router/head';

/** Suffix on every page title, so a browser tab still says which app it is. */
export const APP_NAME = 'FinTrack';

/**
 * Names the document for the web build: browser tabs, history and bookmarks get
 * the screen's own name instead of an empty `<title>`.
 *
 * `Head` renders no UI — it only feeds the static export's `<head>` — so the
 * Stack stays `headerShown: false` and native screens are untouched. Leave
 * `title` off for the bare app name (the root layout's fallback).
 */
export function PageTitle({ title }: { title?: string }) {
  return (
    <Head>
      <title>{title ? `${title} · ${APP_NAME}` : APP_NAME}</title>
    </Head>
  );
}
