"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n/context";

/**
 * The pillars live in a section of the home page rather than on a page of their
 * own. From the home page this scrolls instead of navigating; from anywhere else
 * it is an ordinary link to the home page's anchor, in the current language.
 */
export function PillarsLink({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const { locale, path } = useI18n();
  const home = path("/");
  return <Link href={path("/#pillars")} className={className} onClick={(event) => {
    onClick?.();
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || window.location.pathname !== home) return;
    event.preventDefault();
    window.history.replaceState(null, "", `/${locale}/#pillars`);
    requestAnimationFrame(() => document.getElementById("pillars")?.scrollIntoView({ block: "start" }));
  }}>{children}</Link>;
}
