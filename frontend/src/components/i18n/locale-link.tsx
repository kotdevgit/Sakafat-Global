"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useI18n } from "@/lib/i18n/context";

type Props = Omit<ComponentProps<typeof Link>, "href"> & { href: string };

/**
 * A link that stays in the language being read. Every internal link on the site
 * goes through this, so a visitor reading Urdu never lands on an English page by
 * following a link. External addresses and bare fragments pass through untouched.
 */
export function LocaleLink({ href, ...props }: Props) {
  const { path } = useI18n();
  return <Link href={path(href)} {...props} />;
}
