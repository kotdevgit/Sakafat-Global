import Image from "next/image";
import Link from "next/link";
import { getProgrammes } from "@/lib/api/programmes";
import { ProgrammeCard } from "@/components/programs/programme-card";
import styles from "./programs-section.module.css";

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12h16m-7-7 7 7-7 7" />
    </svg>
  );
}

export async function ProgramsSection() {
  const programmes = (await getProgrammes()).slice(0, 3);

  return (
    <section className={styles.section} aria-labelledby="programs-heading">
      <div className={styles.inner}>
        <header className={styles.header}>
          <div className={styles.headingGroup}>
            <Image src="/images/programs/mic-icon.svg" alt="" width={75} height={77} className={styles.microphone} />
            <div>
              <p className={styles.eyebrow}>Programmes</p>
              <h2 id="programs-heading">Open doors, clearly marked.</h2>
            </div>
          </div>
          <p className={styles.intro}>Every opportunity shows its current status, requirements and next available action.</p>
        </header>
        {programmes.length > 0 ? (
          <ul className={styles.grid}>
            {programmes.map((programme) => (
              <ProgrammeCard key={programme.id} programme={programme} />
            ))}
          </ul>
        ) : (
          <p className={styles.intro}>Programme details are being updated. Please check back shortly.</p>
        )}
        <div className={styles.footer}>
          <Link className={styles.explore} href="/programs">Explore All Programs<ArrowIcon /></Link>
        </div>
      </div>
    </section>
  );
}
