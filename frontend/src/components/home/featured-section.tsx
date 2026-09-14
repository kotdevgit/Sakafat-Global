import Image from "next/image";
import styles from "./featured-section.module.css";

export type FeaturedEpisode = {
  id: string;
  category: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  href?: string;
};

const featuredEpisodes: FeaturedEpisode[] = [
  {
    id: "culture-in-motion",
    category: "Documentary",
    title: "A Culture in Motion",
    description: "People, places and the stories shaping contemporary Pakistan.",
    image: "/images/featured/image1.png",
    imageAlt: "An interviewer speaking with a guest at the Sakafat Global exhibition stand",
  },
  {
    id: "conversations-that-matter",
    category: "Dialogue",
    title: "Conversations that Matter",
    description: "Relevant voices brought into responsible, structured exchange.",
    image: "/images/featured/image2.png",
    imageAlt: "Two women in conversation at the Sakafat Global exhibition stand",
  },
  {
    id: "living-heritage",
    category: "Performance",
    title: "Living Heritage",
    description: "Music, poetry and performance carried forward with care.",
    image: "/images/featured/image3.png",
    imageAlt: "Four guests pictured at microphones during Sakafat Global conversations",
  },
];

export function FeaturedSection({
  episodes = featuredEpisodes,
  allEpisodesHref,
}: {
  episodes?: FeaturedEpisode[];
  allEpisodesHref?: string;
}) {
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
              <span>View All Episodes</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 12h16m-7-7 7 7-7 7" />
              </svg>
            </a>
          ) : (
            <button type="button" className={styles.viewAll} disabled title="All episodes — coming soon">
              <span>View All Episodes</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 12h16m-7-7 7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
        <ul className={styles.grid}>
          {episodes.map((episode, index) => (
            <li key={episode.id} className={styles.card}>
              <article>
                <div className={styles.media}>
                  <Image
                    src={episode.image}
                    alt={episode.imageAlt}
                    fill
                    sizes="(max-width: 639px) calc(100vw - 48px), (max-width: 1023px) calc((100vw - 88px) / 2), (max-width: 1439px) calc((100vw - 144px) / 3), 400px"
                    className={styles.thumbnail}
                  />
                  {episode.href ? (
                    <a className={styles.play} href={episode.href} aria-label={`Watch ${episode.title}`}>
                      <Image src={`/images/featured/${index === 0 ? "play-icon2.svg" : "play-icon.svg"}`} alt="" width={32} height={32} />
                    </a>
                  ) : (
                    <button className={styles.play} type="button" disabled aria-label={`Watch ${episode.title} — coming soon`} title="Episode link — coming soon">
                      <Image src={`/images/featured/${index === 0 ? "play-icon2.svg" : "play-icon.svg"}`} alt="" width={32} height={32} />
                    </button>
                  )}
                </div>
                <div className={styles.body}>
                  <p className={styles.category}>{episode.category}</p>
                  <h3>{episode.title}</h3>
                  <p className={styles.description}>{episode.description}</p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
