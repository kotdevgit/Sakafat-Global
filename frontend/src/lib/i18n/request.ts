import type { NextRequest } from "next/server";
import { defaultLocale, isLocale, localeCookie, type Locale } from "./config";

/**
 * The language a route handler should answer in.
 *
 * Route handlers sit outside /[lang] — the browser calls /api/contact from both
 * language trees — so the locale has to be inferred. The page that made the call
 * is the most reliable signal and needs nothing from the client: a same-origin
 * fetch carries the full referring URL, and every page's URL names its language.
 * The remembered choice is the fallback, and English the last resort.
 */
export function localeFromRequest(request: NextRequest): Locale {
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const [, first] = new URL(referer).pathname.split("/");
      if (isLocale(first)) return first;
    } catch {
      /* A malformed referer tells us nothing; fall through. */
    }
  }
  const remembered = request.cookies.get(localeCookie)?.value;
  return isLocale(remembered) ? remembered : defaultLocale;
}
