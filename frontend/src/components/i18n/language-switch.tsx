"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { localeCookie, localeNames, localePath, localeShortNames, locales, stripLocale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/context";
import styles from "./language-switch.module.css";

/** A year: long enough to be remembered, short enough to expire on its own. */
const cookieMaxAge = 60 * 60 * 24 * 365;

/** Reserves the switch's space until it can read the address it is sitting on. */
export function LanguageSwitchFallback() {
  return <div className={styles.placeholder} />;
}

export function LanguageSwitch({ onNavigate }: { onNavigate?: () => void }) {
  const { locale, dict, t } = useI18n();
  const pathname = usePathname();
  const params = useSearchParams();

  // The same page, in the other language: the locale segment is swapped and
  // everything after it — including any query the page is reading — is kept.
  const rest = stripLocale(pathname);
  const query = params.toString();

  return (
    <div className={styles.switch} data-active={locale} role="group" aria-label={dict.header.languageGroup}>
      {locales.map((candidate) => {
        const label = localeShortNames[candidate];
        if (candidate === locale) {
          return (
            <span
              key={candidate}
              lang={candidate}
              className={`${styles.language} ${styles.active}`}
              aria-current="true"
              aria-label={t(dict.header.currentLanguage, { language: localeNames[candidate] })}
            >
              {label}
            </span>
          );
        }
        return (
          <Link
            key={candidate}
            lang={candidate}
            className={styles.language}
            href={`${localePath(candidate, rest)}${query ? `?${query}` : ""}`}
            aria-label={t(dict.header.switchTo, { language: localeNames[candidate] })}
            onClick={() => {
              onNavigate?.();
              // Remembers the choice for a later visit that arrives without a
              // locale in the URL. The URL still decides what this visit shows.
              document.cookie = `${localeCookie}=${candidate}; path=/; max-age=${cookieMaxAge}; samesite=lax`;
            }}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
