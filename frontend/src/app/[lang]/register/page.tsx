import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/auth-page";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionary";

export async function generateMetadata(): Promise<Metadata> {
  return { ...getDictionary(await getLocale()).meta.register, robots: { index: false, follow: false } };
}

export default function Page() { return <AuthPage mode="register" />; }
