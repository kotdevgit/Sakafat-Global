import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionary";
import { LegalPageLayout } from "@/components/legal/legal-page-layout";

export async function generateMetadata(): Promise<Metadata> {
  return getDictionary(await getLocale()).meta.editorialCharter;
}

export default async function EditorialCharterPage() {
  const dict = getDictionary(await getLocale());
  const copy = dict.editorialCharter;

  return (
    <LegalPageLayout
      eyebrow={copy.eyebrow}
      title={copy.title}
      intro={copy.intro}
      lastUpdated={copy.lastUpdated}
      sections={copy.sections}
      contactNote={copy.contactNote}
      contactHref="/contact?type=general&subject=Editorial+Standards+Enquiry#enquiry-form"
    />
  );
}
