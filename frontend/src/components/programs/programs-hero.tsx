import Image from "next/image";
import { LocaleLink } from "@/components/i18n/locale-link";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionary";
import styles from "./programs-hero.module.css";

export async function ProgramsHero() {
  const copy = getDictionary(await getLocale()).programs.hero;
  return (
    <section className={styles.hero} aria-labelledby="programs-hero-heading">
      <Image src="/images/programs/hero/bg-image.png" alt="" fill preload sizes="100vw" className={styles.background} />
      <div className={styles.overlay} aria-hidden="true" />
      <div className={styles.inner}>
        <div className={styles.copy}>
          <h1 id="programs-hero-heading">{copy.heading}</h1>
          <p>{copy.body}</p>
          <LocaleLink className={styles.join} href="/get-involved">{copy.join}</LocaleLink>
        </div>
      </div>
    </section>
  );
}
