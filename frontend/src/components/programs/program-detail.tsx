import Link from "next/link";
import { ScrollToTop } from "@/components/pillars/scroll-to-top";
import type { Programme } from "@/lib/api/programmes";
import { enquiryHref } from "@/lib/validation/contact";
import styles from "./program-detail.module.css";

function Arrow() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h16m-7-7 7 7-7 7" /></svg>;
}

function ArrowLeft() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5m7 7-7-7 7-7" /></svg>;
}

/**
 * Detail view for one programme. Colours follow the programme's pillar, the same
 * way the cards do, so a programme added in the admin needs no new CSS.
 */
export function ProgramDetailView({ programme }: { programme: Programme }) {
  const isOpen = programme.status === "open" || programme.status === "register_interest";
  // Both branches carry the programme's name, so an enquiry about a programme that
  // has not opened yet still arrives knowing which one it is about.
  const contactHref = enquiryHref(
    "programme",
    isOpen ? programme.name : `${programme.name} — keep me informed`,
  );
  const facts = [
    { term: "Current status", value: programme.statusLabel },
    { term: "Pillar", value: programme.pillarLabel },
    { term: "Access", value: isOpen ? "Open public participation" : "In active formulation" },
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
            <nav className={styles.breadcrumb} aria-label="Breadcrumb">
              <Link href="/programs">Programmes</Link>
              <span aria-hidden="true"> — </span>
              <span aria-current="page">{programme.name}</span>
            </nav>
            <p className={styles.badges}>
              <span className={styles.status}>{programme.statusLabel}</span>
              <span className={styles.pillarBadge}>{programme.pillarLabel}</span>
            </p>
            <h1 id="programme-heading">{programme.name}</h1>
            <p className={styles.intro}>{programme.description}</p>
            <div className={styles.actions}>
              <Link href={contactHref} className={styles.primary}>
                {isOpen ? "Register Interest" : "Ask About This Programme"}<Arrow />
              </Link>
              <Link href="/get-involved" className={styles.secondary}>Other ways to take part</Link>
            </div>
          </div>
        </section>

        <section className={styles.detail} aria-labelledby="detail-heading">
          <div className={styles.detailInner}>
            <div>
              <p className={styles.eyebrow}>At a glance</p>
              <h2 id="detail-heading">
                {isOpen ? "How to take part." : "Where this programme stands."}
              </h2>
              <p className={styles.detailText}>
                {isOpen
                  ? "Register your interest and the programme team will follow up with eligibility, dates and what to prepare. Registering does not guarantee selection."
                  : "This programme is still being shaped. Ask to be kept informed and we will share dates and participation details once they are confirmed."}
              </p>
            </div>
            <dl className={styles.facts}>
              {facts.map((fact) => (
                <div key={fact.term}>
                  <dt>{fact.term}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className={styles.pillarBand} aria-labelledby="pillar-heading">
          <div className={styles.inner}>
            <p className={styles.eyebrow}>The foundation</p>
            <h2 id="pillar-heading">Anchored in {programme.pillarLabel}.</h2>
            <p className={styles.pillarText}>
              {programme.name} carries the purpose of {programme.pillarLabel} into practical work — building
              understanding, capability and cultural participation.
            </p>
            <Link href={`/pillars/${programme.pillar}`} className={styles.pillarLink}>
              Explore the {programme.pillarLabel} pillar<Arrow />
            </Link>
          </div>
        </section>

        <section className={styles.next} aria-labelledby="next-heading">
          <div className={styles.nextCard}>
            <div>
              <p className={styles.eyebrow}>Next step</p>
              <h2 id="next-heading">
                {isOpen ? "Ready to put your name forward?" : "Want to hear when this opens?"}
              </h2>
            </div>
            <Link href={contactHref} className={styles.primary}>
              {isOpen ? "Register Interest" : "Contact Us for Updates"}<Arrow />
            </Link>
          </div>
          <Link href="/programs" className={styles.back}><ArrowLeft />Back to all programmes</Link>
        </section>
      </article>
    </>
  );
}
