import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PillarDetailPage } from "@/components/pillars/pillar-detail";
import { getPillar, pillarDetails } from "@/components/pillars/pillar-data";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return pillarDetails.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pillar = getPillar((await params).slug);
  if (!pillar) notFound();
  return { title: `${pillar.name} — ${pillar.meaning} | Sakafat Global`, description: pillar.introduction };
}

export default async function Page({ params }: Props) {
  const pillar = getPillar((await params).slug);
  if (!pillar) notFound();
  return <PillarDetailPage pillar={pillar} />;
}
