import Image from "next/image";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionary";
import { enquiryFormId } from "@/lib/validation/contact";
import styles from "./contact.module.css";

export async function ContactHero() {
  const copy = getDictionary(await getLocale()).contact.hero;
  return (
    <section className={styles.hero} aria-labelledby="contact-heading">
      <Image src="/images/contact/hero/bg.png" alt="" fill preload sizes="100vw" className={styles.background} />
      <div className={styles.heroInner}>
        <p className={styles.eyebrow} data-enter>{copy.eyebrow}</p>
        <h1 id="contact-heading" data-enter>{copy.headingLine1}<br />{copy.headingLine2}</h1>
        <p className={styles.intro} data-enter>{copy.intro}</p>
        <a href={`#${enquiryFormId}`} className={styles.getStarted} data-enter>{copy.getStarted}</a>
      </div>
    </section>
  );
}
