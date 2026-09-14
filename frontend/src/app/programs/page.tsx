import type { Metadata } from "next";
import { ProgramsHero } from "@/components/programs/programs-hero";

import { ProgramsDiscovery } from "@/components/programs/programs-discovery";
import { ProgramsParticipation, ProgramsStatusNote } from "@/components/programs/programs-participation";

export const metadata: Metadata = {
  title: "Programmes | Sakafat Global",
  description: "Ideas become opportunities through Sakafat Global programmes, open calls and participation pathways.",
};

export default function ProgramsPage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <ProgramsHero />
      <ProgramsDiscovery />
      <ProgramsParticipation />
      <ProgramsStatusNote />
    </main>
  );
}
