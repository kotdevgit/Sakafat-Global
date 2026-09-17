import Image from "next/image";
import { LocaleLink } from "@/components/i18n/locale-link";
import { PillarsLink } from "@/components/layout/pillars-link";
import { getHeroEpisode, heroImageHeight, heroImageWidth, heroPhotoUrl } from "@/lib/api/episodes";
import { getLocale } from "@/lib/i18n/server";
import { format, getDictionary } from "@/lib/i18n/dictionary";
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
  const [heroEpisode, dict] = await Promise.all([getHeroEpisode(), getLocale().then(getDictionary)]);
  const copy = dict.home.hero;
  const episodeUrl = episodeHref ?? heroEpisode?.videoUrl ?? null;
  const episodeLabel = heroEpisode
    ? format(copy.watchLatestNamed, { title: heroEpisode.title })
    : copy.watchLatest;
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
            data-enter="fade"
          />
          <div className={styles.content}>
            <p className={styles.eyebrow} data-enter>{copy.eyebrow}</p>
            <h1 id="hero-heading" className={styles.heading} data-enter>
              {copy.headingLine1}<br />{copy.headingLine2}
            </h1>
            <p className={styles.description} data-enter>{copy.description}</p>
            <div className={styles.actions} data-enter>
              {pillarsHref === "/#pillars" ? (
                <PillarsLink className={styles.primary}>{copy.explorePillars}</PillarsLink>
              ) : pillarsHref ? (
                <LocaleLink className={styles.primary} href={pillarsHref}>{copy.explorePillars}</LocaleLink>
              ) : (
                <button className={styles.primary} type="button" disabled title={copy.pillarsComingSoon}>{copy.explorePillars}</button>
              )}
              {participateHref ? (
                <LocaleLink className={styles.secondary} href={participateHref}>{copy.participate}</LocaleLink>
              ) : (
                <button className={styles.secondary} type="button" disabled title={copy.participationComingSoon}>{copy.participate}</button>
              )}
            </div>
          </div>
        </div>
        <div className={styles.visual} data-enter="zoom">
          <div className={styles.backCard} aria-hidden="true" />
          {episodePhoto ? (
            <div className={styles.episodeFrame}>
              <Image
                className={styles.episodePhoto}
                src={episodePhotoUrl as string}
                alt={episodePhoto.imageAlt || format(copy.stillFrom, { title: episodePhoto.title })}
                width={heroImageWidth}
                height={heroImageHeight}
                sizes="(max-width: 767px) calc(100vw - 56px), (max-width: 1100px) 43vw, 520px"
                preload
              />
              {episodeUrl ? (
                <a className={styles.episodePill} href={episodeUrl} aria-label={episodeLabel}>
                  {copy.latestEpisode}<PlayIcon />
                </a>
              ) : (
                <span className={styles.episodePill} aria-disabled="true" title={copy.latestEpisodeComingSoon}>
                  {copy.latestEpisode}<PlayIcon />
                </span>
              )}
            </div>
          ) : (
            <>
              <Image
                className={styles.episode}
                src="/images/hero/image.png"
                alt={copy.fallbackEpisodeAlt}
                width={heroImageWidth}
                height={heroImageHeight}
                sizes="(max-width: 767px) calc(100vw - 56px), (max-width: 1100px) 43vw, 520px"
                preload
              />
              {episodeUrl ? (
                <a className={styles.episodeLink} href={episodeUrl} aria-label={episodeLabel} />
              ) : (
                <span className={styles.episodeLink} role="link" aria-disabled="true" aria-label={copy.latestEpisodeComingSoon} title={copy.latestEpisodeComingSoon} />
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
