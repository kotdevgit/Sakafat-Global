import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/auth-page";
export const metadata: Metadata = { title: "Verify email | Sakafat Global", robots: { index: false, follow: false } };
export default function Page() { return <AuthPage mode="verify" />; }
