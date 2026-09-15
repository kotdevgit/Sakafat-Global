import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProgrammeBySlug, getProgrammes } from "@/lib/api/programmes";
import { ProgramDetailView } from "@/components/programs/program-detail";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const programmes = await getProgrammes();
  return programmes.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const programme = await getProgrammeBySlug(slug);
  if (!programme) return { title: "Programme Not Found | Sakafat Global" };

  return {
    title: `${programme.name} — ${programme.pillarLabel} | Sakafat Global`,
    description: programme.description,
  };
}

export default async function ProgramPage({ params }: Props) {
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
