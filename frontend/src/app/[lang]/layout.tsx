import type { Metadata } from "next";
import { Montserrat, Noto_Nastaliq_Urdu, Poppins } from "next/font/google";
import { notFound } from "next/navigation";
import "./globals.css";
import { AuthProvider } from "@/components/auth/auth-provider";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteMotion } from "@/components/layout/site-motion";
import { SiteHeader } from "@/components/layout/site-header";
import { I18nProvider } from "@/lib/i18n/context";
import { directionOf, isLocale, locales } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";

const poppins = Poppins({
  weight: ["400", "500", "700"],
  style: "normal",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-poppins",
});

const montserrat = Montserrat({
  weight: ["700", "800"],
  style: "normal",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-montserrat",
});

/**
 * Urdu is set in Nastaliq, which is what the language is actually read in; the
 * Latin faces above have no Arabic-script coverage at all. Nastaliq's sloping
 * baseline needs far more room than a Latin face, which globals.css allows for
 * wherever this family is in use.
 */
const nastaliq = Noto_Nastaliq_Urdu({
  weight: ["400", "500", "700"],
  subsets: ["arabic"],
  display: "swap",
  variable: "--font-nastaliq",
});

/** Both languages are known up front, so both trees are built at build time. */
export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return getDictionary(lang).meta.home;
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  // An unknown segment is a page that does not exist, not English with a strange
  // prefix: 404 rather than silently serving the default language.
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);
  return (
    <html lang={lang} dir={directionOf(lang)}>
      <body className={`${poppins.variable} ${montserrat.variable} ${nastaliq.variable}`}>
        <I18nProvider locale={lang} dict={dict}>
          <AuthProvider>
            <SiteHeader />
            <SiteMotion />
            {children}
            <SiteFooter />
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
