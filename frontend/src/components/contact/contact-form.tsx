"use client";

import { useRef, useState } from "react";
import { contactFieldNames, contactFields, filterValue, validateContact, validateField, type ContactField } from "@/lib/validation/contact";
import { filterInput } from "@/lib/validation/filter";
import styles from "./contact.module.css";

const noFile = "No file selected";

/** Field errors are keyed by the browser field names used in this form. */
type Errors = Record<string, string>;

export function ContactForm() {
  const [fileName, setFileName] = useState(noFile);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const feedback = useRef<HTMLDivElement>(null);
  // A field is only validated live once the visitor has left it, so an error never
  // appears while they are still part-way through typing it.
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [lengths, setLengths] = useState<Record<string, number>>({});

  function check(field: ContactField, value: string) {
    setErrors((current) => {
      const message = validateField(field, value);
      if (current[field] === message || (!current[field] && !message)) return current;
      const next = { ...current };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  }

  /** Wires one field for live validation: on blur, then on every edit afterwards. */
  function liveProps(field: ContactField) {
    return {
      "aria-invalid": errors[field] ? (true as const) : undefined,
      "aria-describedby": errors[field] ? `${field}-error` : undefined,
      maxLength: contactFields[field].maxLength,
      onBlur: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setTouched((current) => ({ ...current, [field]: true }));
        check(field, event.currentTarget.value);
      },
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const element = event.currentTarget;
        // Characters the field does not accept are removed as they are typed, so
        // a digit never lands in a name nor a letter in a phone number.
        const value = element instanceof HTMLSelectElement
          ? element.value
          : filterInput(element, (raw) => filterValue(field, raw));
        setLengths((current) => ({ ...current, [field]: value.length }));
        if (touched[field]) check(field, value);
      },
    };
  }


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

    // Check everything before going near the network, and reveal errors on fields
    // the visitor never focused so nothing fails silently.
    const found = validateContact(
      Object.fromEntries(contactFieldNames.map((field) => [field, String(data.get(field) ?? "")])),
    );
    if (data.get("consent") !== "true") found.consent = "Please confirm you agree before sending.";
    setTouched(Object.fromEntries(contactFieldNames.map((field) => [field, true])));
    if (Object.keys(found).length > 0) {
      showError("Please check the highlighted fields.", found);
      return;
    }

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
      setTouched({});
      setLengths({});
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
            <div><label className={styles.srOnly} htmlFor="full-name">Full Name</label><input id="full-name" name="fullName" autoComplete="name" placeholder="Full Name" required {...liveProps("fullName")} />{errors.fullName && <p id="fullName-error" className={styles.fieldError}>{errors.fullName}</p>}</div>
            <div><label className={styles.srOnly} htmlFor="organisation">Organisation</label><input id="organisation" name="organisation" autoComplete="organization" placeholder="Organisation" {...liveProps("organisation")} />{errors.organisation && <p id="organisation-error" className={styles.fieldError}>{errors.organisation}</p>}</div>
            <div><label className={styles.srOnly} htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" placeholder="Email address" required {...liveProps("email")} />{errors.email && <p id="email-error" className={styles.fieldError}>{errors.email}</p>}</div>
            <div><label className={styles.srOnly} htmlFor="phone">Phone number</label><input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="Phone number" required {...liveProps("phone")} />{errors.phone && <p id="phone-error" className={styles.fieldError}>{errors.phone}</p>}</div>
            <div><label className={styles.srOnly} htmlFor="location">Country and city</label><input id="location" name="location" placeholder="Country and city" {...liveProps("location")} />{errors.location && <p id="location-error" className={styles.fieldError}>{errors.location}</p>}</div>
            <div><label className={styles.srOnly} htmlFor="enquiry-type">Enquiry type</label><select id="enquiry-type" name="enquiryType" defaultValue="" required {...liveProps("enquiryType")}><option value="" disabled>Enquiry type</option><option value="general">General enquiry</option><option value="programme">Programmes and participation</option><option value="creative">Creative collaboration</option><option value="partnership">Partnership enquiry</option><option value="media">Media enquiry</option></select>{errors.enquiryType && <p id="enquiryType-error" className={styles.fieldError}>{errors.enquiryType}</p>}</div>
            <div className={styles.fullWidth}><label className={styles.srOnly} htmlFor="subject">Subject</label><input id="subject" name="subject" placeholder="Subject" required {...liveProps("subject")} /><p className={styles.counter} aria-live="polite">{lengths.subject ?? 0} / {contactFields.subject.maxLength}</p>{errors.subject && <p id="subject-error" className={styles.fieldError}>{errors.subject}</p>}</div>
            <div className={styles.fullWidth}><label className={styles.srOnly} htmlFor="message">Message</label><textarea id="message" name="message" placeholder="Message" rows={4} required {...liveProps("message")} /><p className={styles.counter} aria-live="polite">{lengths.message ?? 0} / {contactFields.message.maxLength}</p>{errors.message && <p id="message-error" className={styles.fieldError}>{errors.message}</p>}</div>
            <div className={styles.fullWidth}><label className={styles.srOnly} htmlFor="portfolio">Relevant link or portfolio</label><input id="portfolio" name="portfolio" type="url" placeholder="Relevant link or portfolio" {...liveProps("portfolio")} />{errors.portfolio && <p id="portfolio-error" className={styles.fieldError}>{errors.portfolio}</p>}</div>
          </div>
          <div className={styles.attachment}>
            <label htmlFor="attachment">Attachment (optional, 5 MB maximum)</label>
            <div className={styles.fileControl}>
              <span className={styles.fileName} aria-live="polite">{fileName}</span>
              <span className={styles.chooseFile} aria-hidden="true">Choose file</span>
              <input id="attachment" name="attachment" type="file" onChange={(event) => setFileName(event.currentTarget.files?.[0]?.name ?? noFile)} aria-invalid={errors.attachment ? true : undefined} aria-describedby={errors.attachment ? "attachment-error" : undefined} />
            </div>
            {errors.attachment && <p id="attachment-error" className={styles.fieldError}>{errors.attachment}</p>}
          </div>
          <label className={styles.consent}>
            <input
              name="consent"
              type="checkbox"
              required
              aria-invalid={errors.consent ? true : undefined}
              aria-describedby={errors.consent ? "consent-error" : undefined}
              onChange={(event) =>
                setErrors((current) => {
                  if (!event.currentTarget.checked || !current.consent) return current;
                  const next = { ...current };
                  delete next.consent;
                  return next;
                })
              }
            />
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
