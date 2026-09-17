import Image from "next/image";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionary";
import styles from "./founder-section.module.css";

export async function FounderSection() {
  const { home, meta } = getDictionary(await getLocale());
  const copy = home.founder;

  return (
    <section className={styles.section} aria-label={copy.sectionAria}>
      <figure className={styles.card} data-reveal="zoom">
        <Image
          src="/images/founder/sakafat-artwork.png"
          alt=""
          fill
          sizes="(max-width: 1376px) 100vw, 1280px"
          className={styles.artwork}
        />
        <Image
          src="/images/founder/founder.png"
          alt={copy.portraitAlt}
          width={225}
          height={230}
          className={styles.portrait}
        />
        <div className={styles.message}>
          <blockquote className={styles.quote}>
            <p>“<strong>{meta.siteName}</strong> {copy.quotePrefix}”</p>
          </blockquote>
          <figcaption className={styles.attribution}>
            <span className={styles.name}>{copy.name}</span>
            <span className={styles.role}>{copy.role}</span>
          </figcaption>
        </div>
      </figure>
    </section>
  );
}
