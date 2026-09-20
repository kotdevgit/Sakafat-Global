import type { CSSProperties } from "react";
import { LocaleLink } from "@/components/i18n/locale-link";
import { enquiryHref } from "@/lib/validation/contact";
import type { Dictionary } from "@/lib/i18n/dictionary";
import styles from "./creator-network.module.css";

function Arrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12h16m-7-7 7 7-7 7" />
    </svg>
  );
}

export function CreatorNetworkView({ dict }: { dict: Dictionary }) {
  const copy = dict.creatorNetwork;
  const applyHref = enquiryHref("creative", copy.cta.subject);

  return (
    <main id="main-content" tabIndex={-1}>
      {/* Hero */}
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.eyebrow} data-enter>{copy.hero.eyebrow}</p>
          <h1 data-enter>{copy.hero.headingLine1}<br />{copy.hero.headingLine2}</h1>
          <p className={styles.heroIntro} data-enter>{copy.hero.intro}</p>
          <LocaleLink href={applyHref} className={styles.primaryAction} data-enter>
            {copy.hero.cta}
            <Arrow />
          </LocaleLink>
        </div>
      </header>

      {/* Disciplines */}
      <section className={styles.section} aria-labelledby="disciplines-heading">
        <div className={styles.inner}>
          <header className={styles.sectionHeader} data-reveal>
            <h2 id="disciplines-heading">{copy.disciplines.heading}</h2>
            <p>{copy.disciplines.intro}</p>
          </header>
          <ul className={styles.grid4}>
            {copy.disciplines.items.map((item, index) => (
              <li
                key={item.title}
                className={styles.card}
                data-reveal
                style={{ "--reveal-index": index } as CSSProperties}
              >
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <span className={styles.tag}>{item.tag}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Models */}
      <section className={`${styles.section} ${styles.sectionAlt}`} aria-labelledby="models-heading">
        <div className={styles.inner}>
          <header className={styles.sectionHeader} data-reveal>
            <h2 id="models-heading">{copy.models.heading}</h2>
            <p>{copy.models.intro}</p>
          </header>
          <ul className={styles.grid3}>
            {copy.models.items.map((item, index) => (
              <li
                key={item.title}
                className={styles.card}
                data-reveal
                style={{ "--reveal-index": index } as CSSProperties}
              >
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <span className={styles.badge}>{item.badge}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Criteria */}
      <section className={styles.section} aria-labelledby="criteria-heading">
        <div className={styles.inner}>
          <header className={styles.sectionHeader} data-reveal>
            <h2 id="criteria-heading">{copy.criteria.heading}</h2>
            <p>{copy.criteria.intro}</p>
          </header>
          <ul className={styles.grid4}>
            {copy.criteria.items.map((item, index) => (
              <li
                key={item.title}
                className={styles.card}
                data-reveal
                style={{ "--reveal-index": index } as CSSProperties}
              >
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Process */}
      <section className={`${styles.section} ${styles.sectionAlt}`} aria-labelledby="process-heading">
        <div className={styles.inner}>
          <header className={styles.sectionHeader} data-reveal>
            <h2 id="process-heading">{copy.process.heading}</h2>
            <p>{copy.process.intro}</p>
          </header>
          <ol className={styles.grid3}>
            {copy.process.steps.map((step, index) => (
              <li
                key={step.title}
                className={styles.card}
                data-reveal
                style={{ "--reveal-index": index } as CSSProperties}
              >
                <span className={styles.stepNumber} aria-hidden="true">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className={styles.ctaBanner} aria-labelledby="cta-heading">
        <div className={styles.ctaCard} data-reveal="zoom">
          <div className={styles.ctaCopy}>
            <h2 id="cta-heading">{copy.cta.heading}</h2>
            <p>{copy.cta.body}</p>
          </div>
          <LocaleLink href={applyHref} className={styles.primaryAction}>
            {copy.cta.action}
            <Arrow />
          </LocaleLink>
        </div>
      </section>
    </main>
  );
}
