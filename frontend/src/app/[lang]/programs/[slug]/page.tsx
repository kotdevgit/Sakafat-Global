import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProgrammeBySlug, getProgrammes } from "@/lib/api/programmes";
import { ProgramDetailView } from "@/components/programs/program-detail";
import { locales } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionary";

/** Every programme in every language, so both trees are built ahead of time. */
export async function generateStaticParams() {
  const programmes = await getProgrammes();
  return locales.flatMap((lang) => programmes.map((p) => ({ lang, slug: p.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/programs/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [programme, dict] = await Promise.all([
    getProgrammeBySlug(slug),
    getLocale().then(getDictionary),
  ]);
  if (!programme) return { title: dict.meta.programmeNotFound };

  return {
    title: `${programme.name} — ${programme.pillarLabel} | ${dict.meta.siteName}`,
    description: programme.description,
  };
}

export default async function ProgramPage({ params }: PageProps<"/[lang]/programs/[slug]">) {
  const { slug } = await params;
  const programme = await getProgrammeBySlug(slug);

  if (!programme) {
    notFound();
  }

  return (
    <main id="main-content" tabIndex={-1}>
      <ProgramDetailView programme={programme} />
    </main>
  );
}
