import type { Metadata } from "next";
import Image from "next/image";
import styles from "@/components/about/about.module.css";

export const metadata: Metadata = {
  title: "About | Sakafat Global",
  description: "Learn about Sakafat Global, our mission, vision and commitment to responsible cultural media and production.",
};

const promises = [
  { title: "Honest Communication", text: "We share programme status clearly." },
  { title: "Privacy & Context", text: "We respect personal data and cultural sensitivity." },
  { title: "Transparent Content", text: "We identify sponsored and commissioned work." },
  { title: "Rights & Consent", text: "We protect contributors and creative ownership." },
  { title: "English & Urdu", text: "We design meaningful experiences in both languages." },
  { title: "Impact With Purpose", text: "We measure value beyond views and followers." },
];

function Artwork() {
  return <Image src="/images/about/artwork/artwork.png" alt="" fill sizes="100vw" className={styles.artwork} />;
}

export default function AboutPage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <section className={styles.hero} aria-label="About Sakafat Global">
        <Image src="/images/about/hero/bg.png" alt="" fill preload sizes="100vw" className={styles.heroImage} />
        <div className={styles.overlay} aria-hidden="true" />
        <div className={styles.heroInner}><h1>Sakafat Global is a Pakistan-rooted media and production company developing cultural content, dialogue, creative formats and participation pathways.</h1></div>
      </section>
      <section className={styles.identity} aria-labelledby="identity-heading">
        <Artwork />
        <div className={styles.inner}>
          <h2 id="identity-heading" className={styles.identityLabel}>Who We Are</h2>
          <div className={styles.identityBody}>
            <Image src="/images/about/who-we-are/Sakafat%20logo.svg" alt="Sakafat Global" width={299} height={191} className={styles.logo} />
            <p>We believe <strong className={styles.culture}>Culture</strong> influences how people <strong className={styles.think}>Think</strong>, <strong className={styles.communicate}>Communicate</strong>, <strong className={styles.collaborate}>Collaborate</strong>, <strong className={styles.create}>Create</strong> and <strong>Build Value.</strong> Our work connects cultural understanding with responsible media, creative production and practical opportunity.</p>
          </div>
          <div className={styles.purposeGrid}>
            {[
              { title: "Our Mission", image: "misson.svg" },
              { title: "Our Vision", image: "vision.svg" },
            ].map((item) => (
              <article key={item.title} className={styles.purposeCard}>
                <Image src={`/images/about/mission-vision/${item.image}`} alt="" width={64} height={64} />
                <div><h3>{item.title}</h3><p>To use media, production and dialogue to strengthen values, understanding, connection, opportunity and cultural heritage.</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className={styles.promise} aria-labelledby="promise-heading">
        <Artwork />
        <div className={styles.inner}>
          <p className={styles.eyebrow}>Our public promise</p>
          <h2 id="promise-heading">Trust, Made Visible.</h2>
          <ol className={styles.promiseGrid}>
            {promises.map((promise, index) => {
              const number = String(index + 1).padStart(2, "0");
              return (
                <li key={promise.title} className={`${styles.promiseCard} ${styles[`tone${index + 1}`]}`}>
                  <Image src={`/images/about/public-promise/${number}.svg`} alt="" width={68} height={68} />
                  <div className={styles.promiseBody}>
                    <span className={styles.number} aria-hidden="true">{number}</span>
                    <h3>{promise.title}</h3><p>{promise.text}</p>
                    <button type="button" disabled className={styles.learn} aria-label={`Learn more about ${promise.title} — coming soon`}>Learn More <span aria-hidden="true">+</span></button>
                  </div>
                </li>
              );
            })}
          </ol>
          <div className={styles.governance}><button type="button" disabled title="Governance standards — coming soon">Read our governance standards <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 12h16m-7-7 7 7-7 7" /></svg></button></div>
        </div>
      </section>
      <section className={styles.statement} aria-label="Company status">
        <p>Sakafat Global operates as a private media and production company. It is not represented as a government authority, charity, broadcaster, legal adviser or nationally representative research institution.</p>
      </section>
    </main>
  );
}
