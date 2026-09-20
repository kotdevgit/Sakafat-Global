import { FounderSection } from "@/components/home/founder-section";
import { FeaturedSection } from "@/components/home/featured-section";
import { IncomingSection } from "@/components/home/incoming-section";
import { HeroSection } from "@/components/home/hero-section";
import { PillarsSection } from "@/components/home/pillars-section";
import { ProgramsSection } from "@/components/home/programs-section";

export default function Home() {
  return (
    <main id="main-content" tabIndex={-1}>
      <HeroSection pillarsHref="/#pillars" participateHref="/get-involved" />
      <FeaturedSection allEpisodesHref="https://www.youtube.com/@sakafat-global" />
      <PillarsSection />
      <ProgramsSection />
      <FounderSection />
      <IncomingSection />
    </main>
  );
}
