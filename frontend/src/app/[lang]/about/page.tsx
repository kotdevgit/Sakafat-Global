import type { Metadata } from "next";
import Image from "next/image";
import { getLocale } from "@/lib/i18n/server";
import { format, getDictionary } from "@/lib/i18n/dictionary";
import styles from "@/components/about/about.module.css";

export async function generateMetadata(): Promise<Metadata> {
  return getDictionary(await getLocale()).meta.about;
}

function Artwork() {
  return <Image src="/images/about/artwork/artwork.png" alt="" fill sizes="100vw" className={styles.artwork} />;
}

export default async function AboutPage() {
  const dict = getDictionary(await getLocale());
  const copy = dict.about;
  const { belief } = copy;
  const purpose = [
    { ...copy.mission, image: "misson.svg" },
    { ...copy.vision, image: "vision.svg" },
  ];

  return (
    <main id="main-content" tabIndex={-1}>
      <section className={styles.hero} aria-label={copy.heroAria}>
        <Image src="/images/about/hero/bg.png" alt="" fill preload sizes="100vw" className={styles.heroImage} />
        <div className={styles.overlay} aria-hidden="true" />
        <div className={styles.heroInner}><h1>{copy.heroHeading}</h1></div>
      </section>
      <section className={styles.identity} aria-labelledby="identity-heading">
        <Artwork />
        <div className={styles.inner}>
          <h2 id="identity-heading" className={styles.identityLabel}>{copy.identityLabel}</h2>
          <div className={styles.identityBody}>
            <Image src="/images/about/who-we-are/Sakafat%20logo.svg" alt={dict.common.logoAlt} width={299} height={191} className={styles.logo} />
            {/*
              The emphasised words are separate entries rather than one sentence
              with markup in it, because the order they fall in differs between
              languages — Urdu puts the verbs where English puts the object.
            */}
            <p>
              {belief.lead} <strong className={styles.culture}>{belief.culture}</strong> {belief.middle}{" "}
              {belief.verbs.map((verb, index) => (
                <span key={verb}>
                  <strong className={styles[`verb${index + 1}`]}>{verb}</strong>
                  {index < belief.verbs.length - 1 ? belief.verbSeparator : ` ${belief.and} `}
                </span>
              ))}
              <strong>{belief.buildValue}</strong> {belief.tail}
            </p>
          </div>
          <div className={styles.purposeGrid}>
            {purpose.map((item) => (
              <article key={item.title} className={styles.purposeCard}>
                <Image src={`/images/about/mission-vision/${item.image}`} alt="" width={64} height={64} />
                <div><h3>{item.title}</h3><p>{item.body}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className={styles.promise} aria-labelledby="promise-heading">
        <Artwork />
        <div className={styles.inner}>
          <p className={styles.eyebrow}>{copy.promiseEyebrow}</p>
          <h2 id="promise-heading">{copy.promiseHeading}</h2>
          <ol className={styles.promiseGrid}>
            {copy.promises.map((promise, index) => {
              const number = String(index + 1).padStart(2, "0");
              return (
                <li key={promise.title} className={`${styles.promiseCard} ${styles[`tone${index + 1}`]}`}>
                  <Image src={`/images/about/public-promise/${number}.svg`} alt="" width={68} height={68} />
                  <div className={styles.promiseBody}>
                    <span className={styles.number} aria-hidden="true">{number}</span>
                    <h3>{promise.title}</h3><p>{promise.text}</p>
                    <button type="button" disabled className={styles.learn} aria-label={format(copy.learnMoreAria, { title: promise.title })}>
                      {copy.learnMore} <span aria-hidden="true">+</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
          <div className={styles.governance}>
            <button type="button" disabled title={copy.governanceComingSoon}>
              {copy.governance}
              <svg className={styles.arrow} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 12h16m-7-7 7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </section>
      <section className={styles.statement} aria-label={copy.statusAria}>
        <p>{copy.statement}</p>
      </section>
    </main>
  );
}
