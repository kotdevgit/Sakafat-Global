import type { Metadata } from "next";
import { Suspense } from "react";
import { ContactHero } from "@/components/contact/contact-hero";
import { ContactForm } from "@/components/contact/contact-form";

export const metadata: Metadata = {
  title: "Contact Us | Sakafat Global",
  description: "Start the right conversation with Sakafat Global. Enquiries about programmes, creative collaboration, and partnerships.",
};

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
