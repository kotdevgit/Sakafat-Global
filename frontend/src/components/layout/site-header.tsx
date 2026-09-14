"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import styles from "./site-header.module.css";

export type NavigationItem = {
  label: string;
  href: string;
  available: boolean;
};

// Enable each destination when its page is implemented.
const navigation: NavigationItem[] = [
  { label: "Home", href: "/", available: true },
  { label: "Pillars", href: "/pillars", available: false },
  { label: "Programs", href: "/programs", available: false },
  { label: "About", href: "/about", available: false },
  { label: "Get involved", href: "/get-involved", available: false },
  { label: "Contact", href: "/contact", available: false },
];

export function SiteHeader({ items = navigation }: { items?: NavigationItem[] }) {
  const pathname = usePathname();
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
      <a className={styles.skipLink} href="#main-content">Skip to content</a>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand} aria-label="Sakafat Global home" onClick={() => setIsOpen(false)}>
          <Image src="/images/sakafat-logo.png" alt="Sakafat Global — Art. Culture. Heritage." width={160} height={110} preload />
        </Link>
        <button
          ref={toggleRef}
          className={styles.toggle}
          type="button"
          aria-expanded={isOpen}
          aria-controls="site-navigation"
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span>{isOpen ? "Close" : "Menu"}</span>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            {isOpen ? <path d="m6 6 12 12M6 18 18 6" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
        <div id="site-navigation" className={`${styles.panel} ${isOpen ? styles.open : ""}`}>
          <nav aria-label="Main navigation">
            <ul className={styles.links}>
              {items.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    {item.available ? (
                      <Link href={item.href} aria-current={active ? "page" : undefined} className={styles.navItem} onClick={() => setIsOpen(false)}>
                        {item.label}
                      </Link>
                    ) : (
                      <span className={styles.navItem} aria-disabled="true" title={`${item.label} — coming soon`}>
                        {item.label}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className={styles.actions}>
            <button className={styles.login} type="button" disabled title="Login — coming soon">Login</button>
            <div className={styles.languages} role="group" aria-label="Website language">
              <span className={styles.english} lang="en" aria-label="English, current language">EN</span>
              <button type="button" lang="ur" disabled aria-label="Urdu — coming soon" title="Urdu — coming soon">UR</button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
