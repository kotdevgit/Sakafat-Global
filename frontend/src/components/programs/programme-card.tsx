import { LocaleLink } from "@/components/i18n/locale-link";
import { actionLabel, type Programme } from "@/lib/api/programmes";
import { format, type Dictionary } from "@/lib/i18n/dictionary";
import styles from "@/components/home/programs-section.module.css";

function ArrowIcon() {
  return (
    <svg className={styles.arrow} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12h16m-7-7 7 7-7 7" />
    </svg>
  );
}

/**
 * Card colours follow the programme's pillar rather than its slug, so a programme
 * added in the admin is styled without anyone writing new CSS for it.
 *
 * The name, description and Django's own status and pillar labels are stored in
 * one language and shown as written; only the card's own words follow the page.
 * They carry dir="auto" so the browser reads each one's own direction from its
 * first letter: English inside an Urdu page keeps its own punctuation order
 * instead of having the full stop thrown to the front of the line.
 */
export function ProgrammeCard({ programme, dict }: { programme: Programme; dict: Dictionary }) {
  const action = actionLabel(programme, dict);
  return (
    <li className={`${styles.card} ${styles[programme.pillar] ?? ""}`}>
      <article className={styles.program}>
        <div
          className={styles.banner}
          style={programme.imageUrl ? { backgroundImage: `url("${encodeURI(programme.imageUrl)}")` } : undefined}
          data-image={programme.imageUrl ? "" : undefined}
          aria-hidden="true"
        >
          <span dir="auto">{programme.name}</span>
        </div>
        <div className={styles.body}>
          <span className={styles.status} dir="auto">{programme.statusLabel}</span>
          <h3 dir="auto">{programme.name}</h3>
          <p className={styles.pillar} dir="auto">{programme.pillarLabel}</p>
          <p className={styles.description} dir="auto">{programme.description}</p>
          <LocaleLink
            href={`/programs/${programme.slug}`}
            className={styles.action}
            aria-label={format(dict.programs.card.actionAria, { action, name: programme.name })}
          >
            {action}<ArrowIcon />
          </LocaleLink>
        </div>
      </article>
    </li>
  );
}
