"use client";

import { useRef, useState } from "react";
import styles from "./contact.module.css";

const noFile = "No file selected";

/** Field errors are keyed by the browser field names used in this form. */
type Errors = Record<string, string>;

function fieldProps(errors: Errors, name: string) {
  return {
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  };
}

export function ContactForm() {
  const [fileName, setFileName] = useState(noFile);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const feedback = useRef<HTMLDivElement>(null);

  function showError(text: string, fields: Errors = {}) {
    setSent(false);
    setMessage(text);
    setErrors(fields);
    requestAnimationFrame(() => feedback.current?.focus());
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    // An unchecked box submits nothing, so state it explicitly for the server check.
    data.set("consent", data.get("consent") === null ? "false" : "true");
    setBusy(true);
    setMessage("");
    setErrors({});
    try {
      const response = await fetch("/api/contact", { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok) {
        showError(result.message || "Please try again.", result.errors ?? {});
        return;
      }
      form.reset();
      setFileName(noFile);
      setSent(true);
      setMessage(result.message);
      requestAnimationFrame(() => feedback.current?.focus());
    } catch {
      showError("We couldn’t connect. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.enquiry} aria-labelledby="enquiry-heading">
      <div className={styles.inner}>
        <header className={styles.enquiryHeader}>
          <div>
            <p className={styles.enquiryEyebrow}>ENQUIRY ROUTINE</p>
            <h2 id="enquiry-heading">Choose the closest enquiry type.</h2>
          </div>
          <p className={styles.enquiryIntro}>This keeps the form relevant and avoids unnecessary data collection.</p>
        </header>
        <form id="enquiry-form" className={styles.form} tabIndex={-1} onSubmit={submit} aria-busy={busy} aria-describedby="submission-note">
          <div ref={feedback} tabIndex={-1} role={sent ? "status" : "alert"} className={message ? (sent ? styles.notice : styles.error) : undefined}>{message}</div>
          <fieldset disabled={busy} className={styles.fieldset}>
          <div className={styles.fields}>
            <div><label className={styles.srOnly} htmlFor="full-name">Full Name</label><input id="full-name" name="fullName" autoComplete="name" placeholder="Full Name" maxLength={150} required {...fieldProps(errors, "fullName")} />{errors.fullName && <p id="fullName-error" className={styles.fieldError}>{errors.fullName}</p>}</div>
            <div><label className={styles.srOnly} htmlFor="organisation">Organisation</label><input id="organisation" name="organisation" autoComplete="organization" placeholder="Organisation" maxLength={200} {...fieldProps(errors, "organisation")} />{errors.organisation && <p id="organisation-error" className={styles.fieldError}>{errors.organisation}</p>}</div>
            <div><label className={styles.srOnly} htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" placeholder="Email address" maxLength={254} required {...fieldProps(errors, "email")} />{errors.email && <p id="email-error" className={styles.fieldError}>{errors.email}</p>}</div>
            <div><label className={styles.srOnly} htmlFor="phone">Phone number</label><input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="Phone number" maxLength={30} {...fieldProps(errors, "phone")} />{errors.phone && <p id="phone-error" className={styles.fieldError}>{errors.phone}</p>}</div>
            <div><label className={styles.srOnly} htmlFor="location">Country and city</label><input id="location" name="location" placeholder="Country and city" maxLength={150} {...fieldProps(errors, "location")} />{errors.location && <p id="location-error" className={styles.fieldError}>{errors.location}</p>}</div>
            <div><label className={styles.srOnly} htmlFor="enquiry-type">Enquiry type</label><select id="enquiry-type" name="enquiryType" defaultValue="" required {...fieldProps(errors, "enquiryType")}><option value="" disabled>Enquiry type</option><option value="general">General enquiry</option><option value="programme">Programmes and participation</option><option value="creative">Creative collaboration</option><option value="partnership">Partnership enquiry</option><option value="media">Media enquiry</option></select>{errors.enquiryType && <p id="enquiryType-error" className={styles.fieldError}>{errors.enquiryType}</p>}</div>
            <div className={styles.fullWidth}><label className={styles.srOnly} htmlFor="subject">Subject</label><input id="subject" name="subject" placeholder="Subject" maxLength={255} required {...fieldProps(errors, "subject")} />{errors.subject && <p id="subject-error" className={styles.fieldError}>{errors.subject}</p>}</div>
            <div className={styles.fullWidth}><label className={styles.srOnly} htmlFor="message">Message</label><textarea id="message" name="message" placeholder="Message" rows={4} maxLength={5000} required {...fieldProps(errors, "message")} />{errors.message && <p id="message-error" className={styles.fieldError}>{errors.message}</p>}</div>
            <div className={styles.fullWidth}><label className={styles.srOnly} htmlFor="portfolio">Relevant link or portfolio</label><input id="portfolio" name="portfolio" type="url" placeholder="Relevant link or portfolio" maxLength={200} {...fieldProps(errors, "portfolio")} />{errors.portfolio && <p id="portfolio-error" className={styles.fieldError}>{errors.portfolio}</p>}</div>
          </div>
          <div className={styles.attachment}>
            <label htmlFor="attachment">Attachment (optional, 5 MB maximum)</label>
            <div className={styles.fileControl}>
              <span className={styles.fileName} aria-live="polite">{fileName}</span>
              <span className={styles.chooseFile} aria-hidden="true">Choose file</span>
              <input id="attachment" name="attachment" type="file" onChange={(event) => setFileName(event.currentTarget.files?.[0]?.name ?? noFile)} {...fieldProps(errors, "attachment")} />
            </div>
            {errors.attachment && <p id="attachment-error" className={styles.fieldError}>{errors.attachment}</p>}
          </div>
          <label className={styles.consent}>
            <input name="consent" type="checkbox" required {...fieldProps(errors, "consent")} />
            <span>I agree that Sakafat Global may use these details to respond to my enquiry. This does not create any partnership, engagement or contractual commitment.</span>
          </label>
          {errors.consent && <p id="consent-error" className={styles.fieldError}>{errors.consent}</p>}
          <button className={styles.send} type="submit">{busy ? "Sending…" : "Send inquiry"}</button>
          </fieldset>
          <p id="submission-note" className={styles.note}>We use these details only to respond to your enquiry. Attachments are limited to 5 MB.</p>
        </form>
      </div>
    </section>
  );
}
