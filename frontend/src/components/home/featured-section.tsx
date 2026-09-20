import Image from "next/image";
import type { CSSProperties } from "react";
import { getEpisodes, type Episode } from "@/lib/api/episodes";
import { getLocale } from "@/lib/i18n/server";
import { format, getDictionary, type Dictionary } from "@/lib/i18n/dictionary";
import styles from "./featured-section.module.css";

function ArrowIcon() {
  return (
    <svg className={styles.arrow} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12h16m-7-7 7 7-7 7" />
    </svg>
  );
}

/**
 * Episode titles, categories and descriptions come from Django, which stores one
 * version of each. They render as written whichever language the page is in.
 */
function EpisodeCard({ episode, index, dict }: { episode: Episode; index: number; dict: Dictionary }) {
  const playIcon = `/images/featured/${index === 0 ? "play-icon2.svg" : "play-icon.svg"}`;
  const copy = dict.home.featured;
  return (
    <li className={styles.card} data-reveal style={{ "--reveal-index": index } as CSSProperties}>
      <article>
        <div className={styles.media}>
          {episode.imageUrl && (
            <Image
              src={episode.imageUrl}
              alt={episode.imageAlt}
              fill
              sizes="(max-width: 639px) calc(100vw - 48px), (max-width: 1023px) calc((100vw - 88px) / 2), (max-width: 1439px) calc((100vw - 144px) / 3), 400px"
              className={styles.thumbnail}
            />
          )}
          {episode.videoUrl ? (
            <a className={styles.play} href={episode.videoUrl} aria-label={format(copy.watch, { title: episode.title })}>
              <Image src={playIcon} alt="" width={32} height={32} />
            </a>
          ) : (
            <button
              className={styles.play}
              type="button"
              disabled
              aria-label={format(copy.watchComingSoon, { title: episode.title })}
              title={copy.episodeLinkComingSoon}
            >
              <Image src={playIcon} alt="" width={32} height={32} />
            </button>
          )}
        </div>
        <div className={styles.body}>
          <p className={styles.category} dir="auto">{episode.categoryLabel}</p>
          <h3 dir="auto">{episode.title}</h3>
          <p className={styles.description} dir="auto">{episode.description}</p>
        </div>
      </article>
    </li>
  );
}

export async function FeaturedSection({ allEpisodesHref }: { allEpisodesHref?: string }) {
  const locale = await getLocale();
  const [episodes, dict] = await Promise.all([getEpisodes(locale), getDictionary(locale)]);
  const copy = dict.home.featured;

  return (
    <section className={styles.section} aria-labelledby="featured-heading">
      <div className={styles.inner}>
        <div className={styles.header} data-reveal>
          <div className={styles.label}>
            <Image src="/images/featured/mic-icon.svg" alt="" width={75} height={77} className={styles.microphone} />
            <h2 id="featured-heading">{copy.heading}</h2>
          </div>
          {allEpisodesHref ? (
            <a
              className={styles.viewAll}
              href={allEpisodesHref}
              {...(allEpisodesHref.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              <span>{copy.viewAll}</span><ArrowIcon />
            </a>
          ) : (
            <button type="button" className={styles.viewAll} disabled title={copy.viewAllComingSoon}>
              <span>{copy.viewAll}</span><ArrowIcon />
            </button>
          )}
        </div>
        {episodes.length > 0 ? (
          <ul className={styles.grid}>
            {episodes.map((episode, index) => (
              <EpisodeCard key={episode.id} episode={episode} index={index} dict={dict} />
            ))}
          </ul>
        ) : (
          <p className={styles.description}>{copy.empty}</p>
        )}
      </div>
    </section>
  );
}
