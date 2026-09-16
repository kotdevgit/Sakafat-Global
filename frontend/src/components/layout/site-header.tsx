"use client";

import Image from "next/image";
import { useAuth } from "@/components/auth/auth-provider";
import { LocaleLink } from "@/components/i18n/locale-link";
import { LanguageSwitch, LanguageSwitchFallback } from "@/components/i18n/language-switch";
import { PillarsLink } from "./pillars-link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { stripLocale } from "@/lib/i18n/config";
import styles from "./site-header.module.css";

export type NavigationItem = {
  /** Key into the header's nav dictionary, so the label follows the language. */
  key: "home" | "pillars" | "programs" | "about" | "getInvolved" | "contact";
  href: string;
  available: boolean;
};

// Enable each destination when its page is implemented.
const navigation: NavigationItem[] = [
  { key: "home", href: "/", available: true },
  { key: "pillars", href: "/#pillars", available: true },
  { key: "programs", href: "/programs", available: true },
  { key: "about", href: "/about", available: true },
  { key: "getInvolved", href: "/get-involved", available: true },
  { key: "contact", href: "/contact", available: true },
];

export function SiteHeader({ items = navigation }: { items?: NavigationItem[] }) {
  // Compared against locale-free hrefs, so "current page" is decided the same
  // way in both languages.
  const pathname = stripLocale(usePathname());
  const { dict } = useI18n();
  const { authenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        toggleRef.current?.focus();
      }
    }
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }
    const desktop = window.matchMedia("(min-width: 1100px)");
    function onResize() {
      if (desktop.matches) setIsOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    desktop.addEventListener("change", onResize);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      desktop.removeEventListener("change", onResize);
    };
  }, [isOpen]);

  return (
    <header
      ref={headerRef}
      className={styles.header}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false);
      }}
    >
      <a className={styles.skipLink} href="#main-content">{dict.header.skipLink}</a>
      <div className={styles.inner}>
        <LocaleLink href="/" className={styles.brand} aria-label={dict.header.homeAria} onClick={() => setIsOpen(false)}>
          <Image src="/images/sakafat-logo.png" alt={dict.common.brandAlt} width={160} height={110} preload />
        </LocaleLink>
        <button
          ref={toggleRef}
          className={styles.toggle}
          type="button"
          aria-expanded={isOpen}
          aria-controls="site-navigation"
          aria-label={isOpen ? dict.header.closeMenu : dict.header.openMenu}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span>{isOpen ? dict.header.close : dict.header.menu}</span>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            {isOpen ? <path d="m6 6 12 12M6 18 18 6" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
        <div id="site-navigation" className={`${styles.panel} ${isOpen ? styles.open : ""}`}>
          <nav aria-label={dict.header.mainNavigation}>
            <ul className={styles.links}>
              {items.map((item) => {
                const label = dict.header.nav[item.key];
                const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    {item.href === "/#pillars" ? (
                      <PillarsLink className={styles.navItem} onClick={() => setIsOpen(false)}>{label}</PillarsLink>
                    ) : item.available ? (
                      <LocaleLink href={item.href} aria-current={active ? "page" : undefined} className={styles.navItem} onClick={() => setIsOpen(false)}>
                        {label}
                      </LocaleLink>
                    ) : (
                      <span className={styles.navItem} aria-disabled="true" title={`${label} — ${dict.common.comingSoon}`}>
                        {label}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className={styles.actions}>
            <LocaleLink className={styles.login} href="/login" onClick={() => setIsOpen(false)}>
              {authenticated ? dict.header.account : dict.header.login}
            </LocaleLink>
            {/*
              The switch reads the current query so the other language lands on
              the same page with the same state. That makes it depend on the URL
              search params, which would otherwise opt every page out of static
              rendering — the boundary keeps that cost to the switch alone.
            */}
            <Suspense fallback={<LanguageSwitchFallback />}>
              <LanguageSwitch onNavigate={() => setIsOpen(false)} />
            </Suspense>
          </div>
        </div>
      </div>
    </header>
  );
}
