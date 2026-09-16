/**
 * The locales the site is published in.
 *
 * Every page lives under /[lang], so the locale is always visible in the URL and
 * an Urdu page can be shared, bookmarked and indexed on its own address. The
 * cookie only records a visitor's choice for the next time they arrive without
 * one — it never overrides the locale the URL asks for.
 */
export const locales = ["en", "ur"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/** Written direction. Urdu is read right to left; the layout mirrors with it. */
export const localeDirection: Record<Locale, "ltr" | "rtl"> = {
  en: "ltr",
  ur: "rtl",
};

/** How each language names itself, which is what a language switch should show. */
export const localeNames: Record<Locale, string> = {
  en: "English",
  ur: "اردو",
};

/** The short label the header toggle carries. */
export const localeShortNames: Record<Locale, string> = {
  en: "EN",
  ur: "UR",
};

/** Remembers a visitor's choice for a later visit that lands without a locale. */
export const localeCookie = "sakafat_locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

export function directionOf(locale: Locale): "ltr" | "rtl" {
  return localeDirection[locale];
}

/**
 * Prefixes an internal path with the locale. Anything that is not a site-relative
 * path — an external URL, a bare fragment, a mailto — is returned untouched.
 */
export function localePath(locale: Locale, path: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

/**
 * The reverse: strips a leading locale segment, so a language switch can rebuild
 * the same page in the other language. Returns "/" for a bare locale root.
 */
export function stripLocale(pathname: string): string {
  const [, first, ...rest] = pathname.split("/");
  if (!isLocale(first)) return pathname;
  return rest.length > 0 ? `/${rest.join("/")}` : "/";
}
