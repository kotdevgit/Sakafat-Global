"use client";

import { createContext, useContext } from "react";
import { directionOf, localePath, type Locale } from "./config";
import { format, type Dictionary } from "./dictionary";

type I18n = {
  locale: Locale;
  dir: "ltr" | "rtl";
  dict: Dictionary;
  /** Prefixes an internal path with the active locale. */
  path: (path: string) => string;
  /** Fills {placeholders} in a dictionary string. */
  t: (template: string, values?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18n | null>(null);

/**
 * Holds the active locale and its dictionary for every client component below
 * it. The server layout loads the dictionary once and passes it down, so only
 * the language actually being shown is sent to the browser.
 */
export function I18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  children: React.ReactNode;
}) {
  const value: I18n = {
    locale,
    dict,
    dir: directionOf(locale),
    path: (path) => localePath(locale, path),
    t: format,
  };
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider.");
  return value;
}
