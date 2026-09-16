import { lang } from "next/root-params";
import { defaultLocale, isLocale, type Locale } from "./config";

/**
 * The locale of the page being rendered, read from the /[lang] segment. Every
 * route sits under that segment, so any server component or server-side helper
 * can ask for it without the locale being threaded through as a prop.
 *
 * Root params are only available in Server Components; a Client Component reads
 * the same value from `useI18n`, and a Route Handler from the request.
 */
export async function getLocale(): Promise<Locale> {
  const value = await lang();
  return isLocale(value) ? value : defaultLocale;
}
