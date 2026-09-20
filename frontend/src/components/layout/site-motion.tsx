"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** One observer for every page; reveals play once without hiding unread content. */
export function SiteMotion() {
  const pathname = usePathname();

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        if (!preference.matches) entry.target.setAttribute("data-motion-seen", "");
        observer.unobserve(entry.target);
      }
    }, { threshold: 0, rootMargin: "0px 0px -24px 0px" });

    const observe = () => {
      document.querySelectorAll("[data-reveal]:not([data-motion-seen])")
        .forEach((element) => observer.observe(element));
    };
    observe();
    // Includes streamed sections and cards replaced by programme filters.
    const mutations = new MutationObserver(observe);
    mutations.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, [pathname]);

  return null;
}
