import type { Metadata } from "next";
import { ProgramsHero } from "@/components/programs/programs-hero";
import { getProgrammes } from "@/lib/api/programmes";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionary";

import { ProgramsDiscovery } from "@/components/programs/programs-discovery";
import { ProgramsParticipation, ProgramsStatusNote } from "@/components/programs/programs-participation";

export async function generateMetadata(): Promise<Metadata> {
  return getDictionary(await getLocale()).meta.programs;
}

export default async function ProgramsPage() {
  const programmes = await getProgrammes();

  return (
    <main id="main-content" tabIndex={-1}>
      <ProgramsHero />
      <ProgramsDiscovery programmes={programmes} />
      <ProgramsParticipation />
      <ProgramsStatusNote />
    </main>
  );
}
