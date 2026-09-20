import type { CSSProperties } from "react";
import { LocaleLink } from "@/components/i18n/locale-link";
import styles from "./legal-content.module.css";

function Arrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12h16m-7-7 7 7-7 7" />
    </svg>
  );
}

export type LegalSection = {
  title: string;
  content: string;
};

export type LegalContactNote = {
  heading: string;
  body: string;
  action: string;
};

export type LegalPageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  lastUpdated: string;
  sections: LegalSection[];
  contactNote: LegalContactNote;
  contactHref?: string;
};

export function LegalPageLayout({
  eyebrow,
  title,
  intro,
  lastUpdated,
  sections,
  contactNote,
  contactHref = "/contact",
}: LegalPageProps) {
  return (
    <main id="main-content" tabIndex={-1}>
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.eyebrow} data-enter>{eyebrow}</p>
          <h1 data-enter>{title}</h1>
          <p className={styles.intro} data-enter>{intro}</p>
          <p className={styles.lastUpdated} data-enter>{lastUpdated}</p>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.contentInner}>
          <ol className={styles.sections}>
            {sections.map((section, index) => {
              const number = String(index + 1).padStart(2, "0");
              return (
                <li
                  key={section.title}
                  className={styles.section}
                  data-reveal
                  style={{ "--reveal-index": index } as CSSProperties}
                >
                  <span className={styles.sectionNumber} aria-hidden="true">{number}</span>
                  <div className={styles.sectionBody}>
                    <h2>{section.title}</h2>
                    <p>{section.content}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          <aside className={styles.contactCard} data-reveal="zoom">
            <div className={styles.contactCopy}>
              <h3>{contactNote.heading}</h3>
              <p>{contactNote.body}</p>
            </div>
            <LocaleLink href={contactHref} className={styles.contactAction}>
              {contactNote.action}
              <Arrow />
            </LocaleLink>
          </aside>
        </div>
      </div>
    </main>
  );
}
