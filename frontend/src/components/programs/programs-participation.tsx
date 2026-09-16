import Link from "next/link";
import styles from "./programs-content.module.css";
import { enquiryHref } from "@/lib/validation/contact";

const steps = [
  { title: "Discover", text: "Find a programme connected to your interests." },
  { title: "Review", text: "Check status, dates, eligibility and terms." },
  { title: "Respond", text: "Apply or register interest when available." },
  { title: "Receive an Update", text: "Receive an acknowledgement and instructions." },
  { title: "Participate", text: "Selected participants receive clear expectations." },
];

export function ProgramsParticipation() {
  return (
    <section className={styles.participation} aria-labelledby="participation-heading">
      <div className={styles.inner}>
        <p className={styles.eyebrow}>Participation</p>
        <h2 id="participation-heading" className={styles.heading}>From discovery to participation.</h2>
        <ol className={styles.steps}>
          {steps.map((step, index) => (
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

export function ProgramsStatusNote() {
  return (
    <section className={styles.statusSection} aria-labelledby="status-heading">
      <div className={styles.statusCard}>
        <div>
          <p className={styles.eyebrow}>Status note</p>
          <h2 id="status-heading">Some details aren’t published yet</h2>
          <p className={styles.statusText}>Dates, eligibility, participation requirements and fees are released only after approval.</p>
        </div>
        <Link className={styles.ask} href={enquiryHref("programme", "Question about programmes")}>Ask a Question</Link>
      </div>
    </section>
  );
}
