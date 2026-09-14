import Image from "next/image";
import Link from "next/link";
import styles from "./programs-hero.module.css";

export function ProgramsHero() {
  return (
    <section className={styles.hero} aria-labelledby="programs-hero-heading">
      <Image src="/images/programs/hero/bg-image.png" alt="" fill preload sizes="100vw" className={styles.background} />
      <div className={styles.overlay} aria-hidden="true" />
      <div className={styles.inner}>
        <div className={styles.copy}>
          <h1 id="programs-hero-heading">Programmes for a stronger cultural tomorrow</h1>
          <p>Ideas become opportunities through clearly governed programmes, open calls and participation pathways.</p>
          <Link className={styles.join} href="/get-involved">Join The Conversation</Link>
        </div>
      </div>
    </section>
  );
}
