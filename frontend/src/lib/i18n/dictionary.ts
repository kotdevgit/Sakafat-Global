import en from "./dictionaries/en.json";
import ur from "./dictionaries/ur.json";
import { defaultLocale, isLocale, type Locale } from "./config";

/**
 * English is the source of truth for the shape: `ur` is typed against it, so a
 * key added to one and forgotten in the other fails the type check rather than
 * rendering "undefined" on a page.
 */
export type Dictionary = typeof en;

const dictionaries: Record<Locale, Dictionary> = { en, ur };

export function getDictionary(locale: Locale | string): Dictionary {
  return isLocale(locale) ? dictionaries[locale] : dictionaries[defaultLocale];
}

/** Fills {placeholders} in a dictionary string. Unknown names are left in place. */
export function format(template: string, values?: Record<string, string | number>): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/gu, (whole, name: string) =>
    name in values ? String(values[name]) : whole,
  );
}
