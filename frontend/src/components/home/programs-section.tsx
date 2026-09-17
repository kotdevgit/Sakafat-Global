import Image from "next/image";
import { getProgrammes } from "@/lib/api/programmes";
import { ProgrammeCard } from "@/components/programs/programme-card";
import { LocaleLink } from "@/components/i18n/locale-link";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionary";
import styles from "./programs-section.module.css";

function ArrowIcon() {
  return (
    <svg className={styles.arrow} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12h16m-7-7 7 7-7 7" />
    </svg>
  );
}

export async function ProgramsSection() {
  const [all, dict] = await Promise.all([getProgrammes(), getLocale().then(getDictionary)]);
  const programmes = all.slice(0, 3);
  const copy = dict.home.programs;

  return (
    <section className={styles.section} aria-labelledby="programs-heading">
      <div className={styles.inner}>
        <header className={styles.header} data-reveal>
          <div className={styles.headingGroup}>
            <Image src="/images/programs/mic-icon.svg" alt="" width={75} height={77} className={styles.microphone} />
            <div>
              <p className={styles.eyebrow}>{copy.eyebrow}</p>
              <h2 id="programs-heading">{copy.heading}</h2>
            </div>
          </div>
          <p className={styles.intro}>{copy.intro}</p>
        </header>
        {programmes.length > 0 ? (
          <ul className={styles.grid}>
            {programmes.map((programme, index) => (
              <ProgrammeCard key={programme.id} programme={programme} dict={dict} index={index} />
            ))}
          </ul>
        ) : (
          <p className={styles.intro}>{copy.empty}</p>
        )}
        <div className={styles.footer} data-reveal="fade">
          <LocaleLink className={styles.explore} href="/programs">{copy.exploreAll}<ArrowIcon /></LocaleLink>
        </div>
      </div>
    </section>
  );
}
