import Image from "next/image";
import { LocaleLink } from "@/components/i18n/locale-link";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionary";
import styles from "./pillars-section.module.css";

/**
 * Artwork and layout only. Every word each card carries — its name, question,
 * description and flagship — lives in the dictionary under the same key, so the
 * section reads in whichever language the page is being served in.
 */
const pillars = [
  { key: "idraak", image: "p1.png", width: 159, height: 88 },
  { key: "rabta", image: "p2.png", width: 133, height: 92 },
  { key: "ikhlakiat", image: "p3.png", width: 153, height: 76 },
  { key: "falah", image: "p4.png", width: 148, height: 76 },
  { key: "sama", image: "p5.png", width: 129, height: 97 },
] as const;

export async function PillarsSection() {
  const dict = getDictionary(await getLocale());
  const copy = dict.home.pillars;

  return (
    <section id="pillars" className={styles.section} aria-labelledby="pillars-heading">
      <div className={styles.inner}>
        <header className={styles.header}>
          <Image className={styles.artwork} src="/images/pillars/Pillars-artwork.png" alt="" width={276} height={81} />
          <p className={styles.eyebrow}>{copy.eyebrow}</p>
          <h2 id="pillars-heading">{copy.heading}</h2>
          <p className={styles.intro}>{copy.intro}</p>
        </header>
        <ul className={styles.grid}>
          {pillars.map((pillar) => {
            const text = dict.pillarsSection[pillar.key];
            return (
              <li className={`${styles.card} ${styles[pillar.key]}`} key={pillar.key}>
                <article className={styles.content}>
                  <div className={styles.logo}>
                    <Image src={`/images/pillars/${pillar.image}`} alt="" width={pillar.width} height={pillar.height} />
                  </div>
                  <div className={styles.copy}>
                    <p className={styles.question}>{text.question}</p>
                    <div className={styles.description}>
                      <h3>{text.name}</h3>{" "}{text.description}<br />{copy.flagshipLabel} {text.flagship}
                    </div>
                  </div>
                  <LocaleLink className={styles.explore} href={`/pillars/${pillar.key}`}>
                    {text.action}
                    <svg className={styles.chevron} width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m6 3 5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </LocaleLink>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
