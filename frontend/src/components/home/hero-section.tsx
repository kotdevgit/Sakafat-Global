import Image from "next/image";
import Link from "next/link";
import { PillarsLink } from "@/components/layout/pillars-link";
import styles from "./hero-section.module.css";

type HeroSectionProps = {
  pillarsHref?: string;
  participateHref?: string;
  episodeHref?: string;
};

/** Destinations stay unavailable until their sections or episode URL are ready. */
export function HeroSection({ pillarsHref, participateHref, episodeHref }: HeroSectionProps) {
  return (
    <section className={styles.hero} aria-labelledby="hero-heading">
      <div className={styles.inner}>
        <div className={styles.copy}>
          <Image
            className={styles.artwork}
            src="/images/hero/Sakafat-artwork.png"
            alt=""
            width={733}
            height={402}
            sizes="(max-width: 767px) 100vw, 733px"
            aria-hidden="true"
            loading="eager"
          />
          <div className={styles.content}>
            <p className={styles.eyebrow}>SAKAFAT GLOBAL</p>
            <h1 id="hero-heading" className={styles.heading}>
              CULTURE AS A<br />SOCIOECONOMIC FORCE.
            </h1>
            <p className={styles.description}>
              A Pakistan-rooted media and production house Storytelling. Dialogue. Creative Production. Opportunity.
            </p>
            <div className={styles.actions}>
              {pillarsHref === "/#pillars" ? (
                <PillarsLink className={styles.primary}>Explore 5 Pillar</PillarsLink>
              ) : pillarsHref ? (
                <Link className={styles.primary} href={pillarsHref}>Explore 5 Pillar</Link>
              ) : (
                <button className={styles.primary} type="button" disabled title="Pillars — coming soon">Explore 5 Pillar</button>
              )}
              {participateHref ? (
                <Link className={styles.secondary} href={participateHref}>Be Part of the signal</Link>
              ) : (
                <button className={styles.secondary} type="button" disabled title="Participation — coming soon">Be Part of the signal</button>
              )}
            </div>
          </div>
        </div>
        <div className={styles.visual}>
          <div className={styles.backCard} aria-hidden="true" />
          <Image
            className={styles.episode}
            src="/images/hero/image.png"
            alt="Two speakers in conversation on the latest Sakafat Global episode"
            width={520}
            height={594}
            sizes="(max-width: 767px) calc(100vw - 56px), (max-width: 1100px) 43vw, 520px"
            preload
          />
          {episodeHref ? (
            <a className={styles.episodeLink} href={episodeHref} aria-label="Watch the latest Sakafat Global episode" />
          ) : (
            <span className={styles.episodeLink} role="link" aria-disabled="true" aria-label="Latest episode — link coming soon" title="Latest episode — link coming soon" />
          )}
        </div>
      </div>
    </section>
  );
}
