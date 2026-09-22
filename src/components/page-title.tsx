import Head from 'expo-router/head';
import { useEffect } from 'react';

/** Suffix on every page title, so a browser tab still says which app it is. */
export const APP_NAME = 'FinTrack';

/**
 * Names the document for the web build: browser tabs, history and bookmarks get
 * the screen's own name instead of an empty `<title>`.
 *
 * `Head` renders no UI — it only feeds the static export's `<head>` — so the
 * Stack stays `headerShown: false` and native screens are untouched. Leave
 * `title` off for the bare app name (the root layout's fallback).
 *
 * The title is also written straight to the document: the static export renders
 * `<head>` before the device's language is known, and on a cold load that
 * pre-rendered title is the one the browser keeps. Writing it again in an effect
 * names the tab in the language actually being read.
 */
export function PageTitle({ title }: { title?: string }) {
  const text = title ? `${title} · ${APP_NAME}` : APP_NAME;

  useEffect(() => {
    if (typeof document !== 'undefined') document.title = text;
  }, [text]);

  return (
    <Head>
      <title>{text}</title>
    </Head>
  );
}
