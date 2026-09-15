import Link from "next/link";
import type { Programme } from "@/lib/api/programmes";
import styles from "./program-detail.module.css";

function ArrowRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14m-7-7 7 7-7 7" />
    </svg>
  );
}

function ArrowLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5m7 7-7-7 7-7" />
    </svg>
  );
}

export function ProgramDetailView({ programme }: { programme: Programme }) {
  const isOpen = programme.status === "open" || programme.status === "register_interest";
  const themeClass = styles[programme.pillar] ?? "";

  return (
    <article className={`${styles.container} ${themeClass}`}>
      <header
        className={styles.hero}
        style={programme.imageUrl ? { backgroundImage: `url("${encodeURI(programme.imageUrl)}")` } : undefined}
        data-image={programme.imageUrl ? "" : undefined}
      >
        <div className={styles.heroInner}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <Link href="/programs">Programmes</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{programme.name}</span>
          </nav>

          <div className={styles.badgeGroup}>
            <span className={styles.statusBadge}>{programme.statusLabel}</span>
            <span className={styles.pillarBadge}>{programme.pillarLabel}</span>
          </div>

          <h1 className={styles.title}>{programme.name}</h1>
          <p className={styles.heroIntro}>{programme.description}</p>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.grid}>
          <section className={styles.overviewSection} aria-labelledby="overview-heading">
            <h2 id="overview-heading">About this Programme</h2>
            <p className={styles.overviewText}>{programme.description}</p>

            <div className={styles.pillarsCard}>
              <h3>Anchored in {programme.pillarLabel}</h3>
              <p>
                This initiative directly aligns with Sakafat’s foundation of {programme.pillarLabel}, fostering engagement,
                capability, and cultural awareness.
              </p>
              <Link href={`/pillars/${programme.pillar}`} className={styles.pillarLink}>
                Learn more about the {programme.pillarLabel} Pillar <ArrowRight />
              </Link>
            </div>
          </section>

          <aside className={styles.sidebarCard} aria-labelledby="action-heading">
            <h2 id="action-heading" className={styles.sidebarTitle}>
              {isOpen ? "Participation & Inquiries" : "Status & Roadmap"}
            </h2>

            <dl className={styles.metaList}>
              <div className={styles.metaItem}>
                <dt>Current Status</dt>
                <dd>{programme.statusLabel}</dd>
              </div>
              <div className={styles.metaItem}>
                <dt>Pillar</dt>
                <dd>{programme.pillarLabel}</dd>
              </div>
              <div className={styles.metaItem}>
                <dt>Access Mode</dt>
                <dd>{isOpen ? "Open Public Participation" : "In Active Formulation"}</dd>
              </div>
            </dl>

            {isOpen ? (
              <Link
                href={`/contact?type=programme&subject=${encodeURIComponent(programme.name)}`}
                className={styles.ctaButton}
              >
                Register Interest <ArrowRight />
              </Link>
            ) : (
              <Link href="/contact" className={styles.ctaButton}>
                Contact Us for Updates <ArrowRight />
              </Link>
            )}

            <div>
              <Link href="/programs" className={styles.backLink}>
                <ArrowLeft /> Back to all programmes
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </article>
  );
}
