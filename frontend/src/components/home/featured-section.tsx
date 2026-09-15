import Image from "next/image";
import { getEpisodes, type Episode } from "@/lib/api/episodes";
import styles from "./featured-section.module.css";

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12h16m-7-7 7 7-7 7" />
    </svg>
  );
}

function EpisodeCard({ episode, index }: { episode: Episode; index: number }) {
  const playIcon = `/images/featured/${index === 0 ? "play-icon2.svg" : "play-icon.svg"}`;
  return (
    <li className={styles.card}>
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
            <a className={styles.play} href={episode.videoUrl} aria-label={`Watch ${episode.title}`}>
              <Image src={playIcon} alt="" width={32} height={32} />
            </a>
          ) : (
            <button className={styles.play} type="button" disabled aria-label={`Watch ${episode.title} — coming soon`} title="Episode link — coming soon">
              <Image src={playIcon} alt="" width={32} height={32} />
            </button>
          )}
        </div>
        <div className={styles.body}>
          <p className={styles.category}>{episode.categoryLabel}</p>
          <h3>{episode.title}</h3>
          <p className={styles.description}>{episode.description}</p>
        </div>
      </article>
    </li>
  );
}

export async function FeaturedSection({ allEpisodesHref }: { allEpisodesHref?: string }) {
  const episodes = await getEpisodes();

  return (
    <section className={styles.section} aria-labelledby="featured-heading">
      <div className={styles.inner}>
        <div className={styles.header}>
          <div className={styles.label}>
            <Image src="/images/featured/mic-icon.svg" alt="" width={75} height={77} className={styles.microphone} />
            <h2 id="featured-heading">Featured by Sakafat</h2>
          </div>
          {allEpisodesHref ? (
            <a className={styles.viewAll} href={allEpisodesHref}>
              <span>View All Episodes</span><ArrowIcon />
            </a>
          ) : (
            <button type="button" className={styles.viewAll} disabled title="All episodes — coming soon">
              <span>View All Episodes</span><ArrowIcon />
            </button>
          )}
        </div>
        {episodes.length > 0 ? (
          <ul className={styles.grid}>
            {episodes.map((episode, index) => (
              <EpisodeCard key={episode.id} episode={episode} index={index} />
            ))}
          </ul>
        ) : (
          <p className={styles.description}>Episodes are being updated. Please check back shortly.</p>
        )}
      </div>
    </section>
  );
}
