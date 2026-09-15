import Link from "next/link";
import { actionLabel, type Programme } from "@/lib/api/programmes";
import styles from "@/components/home/programs-section.module.css";

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12h16m-7-7 7 7-7 7" />
    </svg>
  );
}

/**
 * Card colours follow the programme's pillar rather than its slug, so a programme
 * added in the admin is styled without anyone writing new CSS for it.
 */
export function ProgrammeCard({ programme }: { programme: Programme }) {
  const action = actionLabel(programme);
  return (
    <li className={`${styles.card} ${styles[programme.pillar] ?? ""}`}>
      <article className={styles.program}>
        <div
          className={styles.banner}
          style={programme.imageUrl ? { backgroundImage: `url("${encodeURI(programme.imageUrl)}")` } : undefined}
          data-image={programme.imageUrl ? "" : undefined}
          aria-hidden="true"
        >
          <span>{programme.name}</span>
        </div>
        <div className={styles.body}>
          <span className={styles.status}>{programme.statusLabel}</span>
          <h3>{programme.name}</h3>
          <p className={styles.pillar}>{programme.pillarLabel}</p>
          <p className={styles.description}>{programme.description}</p>
          <Link
            href={`/programs/${programme.slug}`}
            className={styles.action}
            aria-label={`${action}: ${programme.name}`}
          >
            {action}<ArrowIcon />
          </Link>
        </div>
      </article>
    </li>
  );
}
