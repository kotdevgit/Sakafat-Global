import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PillarDetailPage } from "@/components/pillars/pillar-detail";
import { getPillar, pillarDetails } from "@/components/pillars/pillar-data";
import { locales } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionary";

export function generateStaticParams() {
  return locales.flatMap((lang) => pillarDetails.map(({ slug }) => ({ lang, slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/pillars/[slug]">): Promise<Metadata> {
  const pillar = getPillar((await params).slug);
  if (!pillar) notFound();
  const dict = getDictionary(await getLocale());
  const text = dict.pillarDetail.pillars[pillar.slug];
  return {
    title: `${text.name}${dict.pillarDetail.titleSeparator}${text.meaning} | ${dict.meta.siteName}`,
    description: text.introduction,
  };
}

export default async function Page({ params }: PageProps<"/[lang]/pillars/[slug]">) {
  const pillar = getPillar((await params).slug);
  if (!pillar) notFound();
  return <PillarDetailPage pillar={pillar} />;
}
