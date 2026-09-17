import type { CSSProperties } from "react";
import { ScrollToTop } from "@/components/pillars/scroll-to-top";
import { LocaleLink } from "@/components/i18n/locale-link";
import type { Programme } from "@/lib/api/programmes";
import { enquiryHref } from "@/lib/validation/contact";
import { getLocale } from "@/lib/i18n/server";
import { format, getDictionary } from "@/lib/i18n/dictionary";
import styles from "./program-detail.module.css";

function Arrow() {
  return <svg className={styles.arrow} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h16m-7-7 7 7-7 7" /></svg>;
}

function ArrowBack() {
  return <svg className={styles.arrow} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5m7 7-7-7 7-7" /></svg>;
}

/**
 * Detail view for one programme. Colours follow the programme's pillar, the same
 * way the cards do, so a programme added in the admin needs no new CSS.
 *
 * The programme's own name, description and Django's status and pillar labels
 * are stored once and shown as written; the surrounding copy follows the page.
 */
export async function ProgramDetailView({ programme }: { programme: Programme }) {
  const dict = getDictionary(await getLocale());
  const copy = dict.programs.detail;
  const isOpen = programme.status === "open" || programme.status === "register_interest";
  // Both branches carry the programme's name, so an enquiry about a programme that
  // has not opened yet still arrives knowing which one it is about.
  const contactHref = enquiryHref(
    "programme",
    isOpen ? programme.name : format(copy.keepMeInformed, { name: programme.name }),
  );
  const facts = [
    { term: copy.facts.status, value: programme.statusLabel },
    { term: copy.facts.pillar, value: programme.pillarLabel },
    { term: copy.facts.access, value: isOpen ? copy.facts.accessOpen : copy.facts.accessClosed },
  ];

  return (
    <>
      <ScrollToTop />
      <article className={styles[programme.pillar] ?? styles.neutral}>
        <section
          className={styles.hero}
          style={programme.imageUrl ? { backgroundImage: `url("${encodeURI(programme.imageUrl)}")` } : undefined}
          data-image={programme.imageUrl ? "" : undefined}
          aria-labelledby="programme-heading"
        >
          <div className={styles.heroInner}>
            <nav className={styles.breadcrumb} aria-label={copy.breadcrumb} data-enter>
              <LocaleLink href="/programs">{copy.programmesLink}</LocaleLink>
              <span aria-hidden="true"> — </span>
              <span aria-current="page" dir="auto">{programme.name}</span>
            </nav>
            <p className={styles.badges} data-enter>
              <span className={styles.status} dir="auto">{programme.statusLabel}</span>
              <span className={styles.pillarBadge} dir="auto">{programme.pillarLabel}</span>
            </p>
            <h1 id="programme-heading" dir="auto" data-enter>{programme.name}</h1>
            <p className={styles.intro} dir="auto" data-enter>{programme.description}</p>
            <div className={styles.actions} data-enter>
              <LocaleLink href={contactHref} className={styles.primary}>
                {isOpen ? copy.registerInterest : copy.askAbout}<Arrow />
              </LocaleLink>
              <LocaleLink href="/get-involved" className={styles.secondary}>{copy.otherWays}</LocaleLink>
            </div>
          </div>
        </section>

        <section className={styles.detail} aria-labelledby="detail-heading">
          <div className={styles.detailInner}>
            <div data-reveal>
              <p className={styles.eyebrow}>{copy.glanceEyebrow}</p>
              <h2 id="detail-heading">{isOpen ? copy.headingOpen : copy.headingClosed}</h2>
              <p className={styles.detailText}>{isOpen ? copy.bodyOpen : copy.bodyClosed}</p>
            </div>
            <dl className={styles.facts} data-reveal style={{ "--reveal-index": 1 } as CSSProperties}>
              {facts.map((fact) => (
                <div key={fact.term}>
                  <dt>{fact.term}</dt>
                  <dd dir="auto">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className={styles.pillarBand} aria-labelledby="pillar-heading">
          <div className={styles.inner} data-reveal>
            <p className={styles.eyebrow}>{copy.foundationEyebrow}</p>
            <h2 id="pillar-heading">{format(copy.foundationHeading, { pillar: programme.pillarLabel })}</h2>
            <p className={styles.pillarText}>
              {format(copy.foundationBody, { name: programme.name, pillar: programme.pillarLabel })}
            </p>
            <LocaleLink href={`/pillars/${programme.pillar}`} className={styles.pillarLink}>
              {format(copy.explorePillar, { pillar: programme.pillarLabel })}<Arrow />
            </LocaleLink>
          </div>
        </section>

        <section className={styles.next} aria-labelledby="next-heading">
          <div className={styles.nextCard} data-reveal="zoom">
            <div>
              <p className={styles.eyebrow}>{copy.nextEyebrow}</p>
              <h2 id="next-heading">{isOpen ? copy.nextHeadingOpen : copy.nextHeadingClosed}</h2>
            </div>
            <LocaleLink href={contactHref} className={styles.primary}>
              {isOpen ? copy.nextActionOpen : copy.nextActionClosed}<Arrow />
            </LocaleLink>
          </div>
          <LocaleLink href="/programs" className={styles.back} data-reveal="fade"><ArrowBack />{copy.back}</LocaleLink>
        </section>
      </article>
    </>
  );
}
