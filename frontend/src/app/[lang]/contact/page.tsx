import type { Metadata } from "next";
import { Suspense } from "react";
import { ContactHero } from "@/components/contact/contact-hero";
import { ContactForm } from "@/components/contact/contact-form";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionary";

export async function generateMetadata(): Promise<Metadata> {
  return getDictionary(await getLocale()).meta.contact;
}

export default function ContactPage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <ContactHero />
      {/*
        The form reads ?type and ?subject so other pages can frame the enquiry.
        Reading them is a client concern, so the boundary keeps the rest of the
        page prerendered rather than making the whole route dynamic.
      */}
      <Suspense>
        <ContactForm />
      </Suspense>
    </main>
  );
}
