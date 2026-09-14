"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export function PillarsLink({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return <Link href="/#pillars" className={className} onClick={(event) => {
    onClick?.();
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || window.location.pathname !== "/") return;
    event.preventDefault();
    window.history.replaceState(null, "", "/#pillars");
    requestAnimationFrame(() => document.getElementById("pillars")?.scrollIntoView({ block: "start" }));
  }}>{children}</Link>;
}
