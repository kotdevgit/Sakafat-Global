import { LocaleLink } from "@/components/i18n/locale-link";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionary";
import { enquiryHref } from "@/lib/validation/contact";
import styles from "./programs-content.module.css";

export async function ProgramsParticipation() {
  const copy = getDictionary(await getLocale()).programs.participation;
  return (
    <section className={styles.participation} aria-labelledby="participation-heading">
      <div className={styles.inner}>
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h2 id="participation-heading" className={styles.heading}>{copy.heading}</h2>
        <ol className={styles.steps}>
          {copy.steps.map((step, index) => (
            <li key={step.title} className={styles.step}>
              <span className={styles.number} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <div><h3>{step.title}</h3><p>{step.text}</p></div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export async function ProgramsStatusNote() {
  const copy = getDictionary(await getLocale()).programs.statusNote;
  return (
    <section className={styles.statusSection} aria-labelledby="status-heading">
      <div className={styles.statusCard}>
        <div>
          <p className={styles.eyebrow}>{copy.eyebrow}</p>
          <h2 id="status-heading">{copy.heading}</h2>
          <p className={styles.statusText}>{copy.body}</p>
        </div>
        <LocaleLink className={styles.ask} href={enquiryHref("programme", copy.askSubject)}>{copy.ask}</LocaleLink>
      </div>
    </section>
  );
}
