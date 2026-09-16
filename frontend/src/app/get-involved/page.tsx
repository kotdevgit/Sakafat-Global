import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { enquiryHref } from "@/lib/validation/contact";
import styles from "@/components/get-involved/get-involved.module.css";

export const metadata: Metadata = {
  title: "Get Involved | Sakafat Global",
  description: "Find your pathway to participate in Sakafat Global as a creator, guest, studio, institution or partner.",
};

/**
 * Every pathway leads somewhere. Most open the enquiry form with the type and
 * subject already set, so the visitor does not have to restate why they came;
 * the two that have a page of their own link to it instead.
 */
const pathways = [
  { title: "Submit Your Story", description: "Share a cultural story, idea, creative work or perspective through an approved open call.", action: "View Open Calls", href: "/programs" },
  { title: "Become a Podcast Guest", description: "Propose yourself or another relevant voice for an interview, discussion or Sakafat production.", action: "Propose a Guest", href: enquiryHref("creative", "Podcast guest proposal") },
  { title: "Join as a Creator", description: "Express interest in writing, audio, video, music, performance or other creative work.", action: "Join the Creator Network", href: enquiryHref("creative", "Creator network application") },
  { title: "Register a Studio", description: "Submit production capabilities, facilities, portfolio and operational information.", action: "Register Your Studio", href: enquiryHref("partnership", "Studio registration") },
  { title: "Propose a Production", description: "Submit a podcast, documentary, series or creative-format concept for consideration.", action: "Propose a Format", href: enquiryHref("creative", "Production proposal") },
  { title: "Join a Programme", description: "Explore active programmes, eligibility requirements and participation opportunities.", action: "Explore Programmes", href: "/programs" },
  { title: "Partner With Sakafat", description: "Propose structured institutional, educational, media or responsible commercial collaboration.", action: "Start a Partnership Enquiry", href: enquiryHref("partnership", "Partnership enquiry") },
];

function Arrow() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h16m-7-7 7 7-7 7" /></svg>;
}

export default function GetInvolvedPage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <section className={styles.hero} aria-labelledby="involved-heading">
        <div className={styles.heroInner}>
          <Image src="/images/get-involved/hero/Sakafat-logo%202.svg" loading="eager" alt="" width={600} height={329} className={styles.artwork} />
          <div className={styles.heroCopy}>
            <h1 id="involved-heading">Your voice can<br />move culture forward.</h1>
            <p>Whether you are a creator, guest, institution, studio or responsible commercial organisation, there is a pathway for you to participate.</p>
          </div>
          <p className={styles.guidance}>Choose the description below that fits you best to see the pathways built for it — or browse all seven at once.</p>
        </div>
      </section>
      <section className={styles.pathways} aria-labelledby="pathways-heading">
        <div className={styles.inner}>
          <header className={styles.sectionHeader}>
            <div><p className={styles.eyebrow}>Choose your pathway</p><h2 id="pathways-heading">How would you like to take part?</h2></div>
            <p className={styles.intro}>Open each pathway to see what to prepare and where your information will go.</p>
          </header>
          <div className={styles.accordions}>
            {pathways.map((pathway) => (
              <details className={styles.accordion} key={pathway.title}>
                <summary><h3>{pathway.title}</h3><span className={styles.plus} aria-hidden="true" /></summary>
                <div className={styles.panel}>
                  <p>{pathway.description}</p>
                  <Link href={pathway.href} className={styles.action}>{pathway.action}<Arrow /></Link>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
      <section className={styles.participation} aria-labelledby="participation-note-heading">
        <div className={styles.note}>
          <Image src="/images/get-involved/participation/bg-image.png" alt="" fill sizes="(max-width: 1199px) 100vw, 1140px" className={styles.noteImage} />
          <div className={styles.noteOverlay} aria-hidden="true" />
          <div className={styles.noteCopy}>
            <h2 id="participation-note-heading">Participation note</h2>
            <p>Registration or submission does not guarantee approval, selection, commissioning, funding, distribution or employment. Selected participants will receive clear expectations, permissions and written terms where required.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
