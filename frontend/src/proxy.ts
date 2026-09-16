import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale, localeCookie, type Locale } from "@/lib/i18n/config";

/**
 * Every page lives under /[lang]. A request that arrives without a locale — an
 * old bookmark, a link someone typed, the bare domain — is redirected to one, so
 * there is exactly one address per page per language.
 *
 * The locale is chosen from the visitor's own signals in order of how
 * deliberate they are: a language they picked here before, then the languages
 * their browser asks for, then English.
 */
function preferredLocale(request: NextRequest): Locale {
  const chosen = request.cookies.get(localeCookie)?.value;
  if (isLocale(chosen)) return chosen;

  const header = request.headers.get("accept-language");
  if (!header) return defaultLocale;

  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...parameters] = part.trim().split(";");
      const quality = parameters
        .map((parameter) => parameter.trim())
        .find((parameter) => parameter.startsWith("q="));
      const weight = quality ? Number.parseFloat(quality.slice(2)) : 1;
      return { tag: tag.trim().toLowerCase(), weight: Number.isFinite(weight) ? weight : 0 };
    })
    .filter((entry) => entry.tag && entry.weight > 0)
    .sort((a, b) => b.weight - a.weight);

  for (const { tag } of ranked) {
    // "ur-PK" and "ur" both mean Urdu; match on the base language only.
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }
  return defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const [, first] = pathname.split("/");
  if (isLocale(first)) return NextResponse.next();

  const locale = preferredLocale(request);
  const target = request.nextUrl.clone();
  target.pathname = pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;
  return NextResponse.redirect(target);
}

export const config = {
  /**
   * Route handlers under /api are called by the browser at a fixed address and
   * carry no locale, so they are excluded along with Next's own assets and
   * anything in public/ (matched by having a file extension).
   */
  matcher: ["/((?!api|_next|.*\\.[^/]+$).*)"],
};
