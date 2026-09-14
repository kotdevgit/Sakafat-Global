import Image from "next/image";
import styles from "./founder-section.module.css";

export function FounderSection() {
  return (
    <section className={styles.section} aria-label="A message from our founder">
      <figure className={styles.card}>
        <Image
          src="/images/founder/sakafat-artwork.png"
          alt=""
          fill
          sizes="(max-width: 1376px) 100vw, 1280px"
          className={styles.artwork}
        />
        <Image
          src="/images/founder/founder.png"
          alt="Meeran Nasir, founder of Sakafat Global"
          width={225}
          height={230}
          className={styles.portrait}
        />
        <div className={styles.message}>
          <blockquote className={styles.quote}>
            <p>“<strong>Sakafat Global</strong> was established from a belief that culture has practical power. It shapes how people see themselves, communicate across difference, develop confidence and participate in the future of their communities.”</p>
          </blockquote>
          <figcaption className={styles.attribution}>
            <span className={styles.name}>Meeran Nasir</span>
            <span className={styles.role}>Founder, Director &amp; Chief Executive Officer</span>
          </figcaption>
        </div>
      </figure>
    </section>
  );
}
