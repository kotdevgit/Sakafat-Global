import Image from "next/image";
import Link from "next/link";
import styles from "./programs-section.module.css";

const programs = [
  {
    id: "signals",
    title: "Sakafat Signals 01.0",
    pillar: "Ikhlakiat",
    status: "Open",
    description: "A bilingual cultural-media open call designed to discover emerging stories, creative ideas and cultural voices.",
    action: "Register Interest",
  },
  {
    id: "lawtency",
    title: "Lawtency",
    pillar: "Idraak",
    status: "In Development",
    description: "Accessible legal awareness and civic understanding through responsible public education and dialogue.",
    action: "View Details",
  },
  {
    id: "confidence",
    title: "Confidence Camp",
    pillar: "Falah",
    status: "Register Interest",
    description: "Practical experiences designed to strengthen communication, confidence and meaningful participation.",
    action: "View Details",
  },
];

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12h16m-7-7 7 7-7 7" />
    </svg>
  );
}

export function ProgramsSection() {
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
        <ul className={styles.grid}>
          {programs.map((program) => (
            <li className={`${styles.card} ${styles[program.id]}`} key={program.id}>
              <article className={styles.program}>
                <div className={styles.banner} aria-hidden="true">{program.title}</div>
                <div className={styles.body}>
                  <span className={styles.status}>{program.status}</span>
                  <h3>{program.title}</h3>
                  <p className={styles.pillar}>{program.pillar}</p>
                  <p className={styles.description}>{program.description}</p>
                  <button type="button" className={styles.action} disabled aria-label={`${program.action}: ${program.title} — coming soon`} title="Coming soon">
                    {program.action}<ArrowIcon />
                  </button>
                </div>
              </article>
            </li>
          ))}
        </ul>
        <div className={styles.footer}>
          <Link className={styles.explore} href="/programs">Explore All Programs<ArrowIcon /></Link>
        </div>
      </div>
    </section>
  );
}
