import Image from "next/image";
import Link from "next/link";
import { PillarsLink } from "@/components/layout/pillars-link";
import { getHeroEpisode, heroImageHeight, heroImageWidth, heroPhotoUrl } from "@/lib/api/episodes";
import styles from "./hero-section.module.css";

type HeroSectionProps = {
  pillarsHref?: string;
  participateHref?: string;
  /** Overrides the episode the card links to; otherwise the first published one is used. */
  episodeHref?: string;
};

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M8 5.5v13l11-6.5z" />
    </svg>
  );
}

/** Destinations stay unavailable until their sections or episode URL are ready. */
export async function HeroSection({ pillarsHref, participateHref, episodeHref }: HeroSectionProps) {
  const heroEpisode = await getHeroEpisode();
  const episodeUrl = episodeHref ?? heroEpisode?.videoUrl ?? null;
  const episodeLabel = heroEpisode
    ? `Watch the latest Sakafat Global episode: ${heroEpisode.title}`
    : "Watch the latest Sakafat Global episode";
  // The supplied artwork already has the "Latest Episode" pill drawn into it, so the
  // markup pill is only rendered over an episode photo, never over that fallback.
  // A photo smaller than the slot is still used; it just renders soft.
  const episodePhotoUrl = heroEpisode ? heroPhotoUrl(heroEpisode) : null;
  const episodePhoto = heroEpisode && episodePhotoUrl ? heroEpisode : null;
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
          {episodePhoto ? (
            <div className={styles.episodeFrame}>
              <Image
                className={styles.episodePhoto}
                src={episodePhotoUrl as string}
                alt={episodePhoto.imageAlt || `Still from ${episodePhoto.title}`}
                width={heroImageWidth}
                height={heroImageHeight}
                sizes="(max-width: 767px) calc(100vw - 56px), (max-width: 1100px) 43vw, 520px"
                preload
              />
              {episodeUrl ? (
                <a className={styles.episodePill} href={episodeUrl} aria-label={episodeLabel}>
                  Latest Episode<PlayIcon />
                </a>
              ) : (
                <span className={styles.episodePill} aria-disabled="true" title="Latest episode — link coming soon">
                  Latest Episode<PlayIcon />
                </span>
              )}
            </div>
          ) : (
            <>
              <Image
                className={styles.episode}
                src="/images/hero/image.png"
                alt="Two speakers in conversation on the latest Sakafat Global episode"
                width={heroImageWidth}
                height={heroImageHeight}
                sizes="(max-width: 767px) calc(100vw - 56px), (max-width: 1100px) 43vw, 520px"
                preload
              />
              {episodeUrl ? (
                <a className={styles.episodeLink} href={episodeUrl} aria-label={episodeLabel} />
              ) : (
                <span className={styles.episodeLink} role="link" aria-disabled="true" aria-label="Latest episode — link coming soon" title="Latest episode — link coming soon" />
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
