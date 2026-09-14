import type { Metadata } from "next";
import { ContactHero } from "@/components/contact/contact-hero";
import { ContactForm } from "@/components/contact/contact-form";

export const metadata: Metadata = {
  title: "Contact Us | Sakafat Global",
  description: "Start the right conversation with Sakafat Global. Enquiries about programmes, creative collaboration, and partnerships.",
};

export default function ContactPage() {
  return <main id="main-content" tabIndex={-1}><ContactHero /><ContactForm /></main>;
}
