"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  contactFieldNames,
  contactFields,
  enquiryFormId,
  enquiryOptions,
  filterValue,
  resolveContactMessage,
  validateContact,
  validateField,
  type ContactField,
} from "@/lib/validation/contact";
import { filterInput } from "@/lib/validation/filter";
import { useI18n } from "@/lib/i18n/context";
import styles from "./contact.module.css";

/*
  The character counters are wrapped in dir="ltr" because "0 / 100" is a numeric
  expression, not prose: the slash between the numbers is a neutral character, so
  an Urdu page would otherwise reorder it to "100 / 0" and reverse its meaning.
  The paragraph itself stays in the page direction, so it still sits at the end
  of the line — the left, in Urdu.
*/

/** Field errors are keyed by the browser field names used in this form. */
type Errors = Record<string, string>;

export function ContactForm() {
  const { dict } = useI18n();
  const copy = dict.contact.form;
  const options = useMemo(() => enquiryOptions(dict), [dict]);

  // Pathway and programme pages link here with the enquiry already framed, so the
  // visitor lands on a form that knows why they came.
  const params = useSearchParams();
  const requestedType = params.get("type") ?? "";
  const presetType = options.some(([value]) => value === requestedType) ? requestedType : "";
  const presetSubject = filterValue("subject", params.get("subject") ?? "");

  const [fileName, setFileName] = useState(copy.noFile);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const feedback = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // A visitor who arrived from a call to action already knows what they want, so
  // put them on the form rather than the top of the page. Someone who chose
  // "Contact" from the navigation carries neither the anchor nor a prefill, and
  // still lands on the hero.
  const arrivedFromCallToAction = Boolean(presetType || presetSubject);
  useEffect(() => {
    if (!arrivedFromCallToAction && window.location.hash !== `#${enquiryFormId}`) return;

    // The form sits behind a Suspense boundary, so it is not in the document when
    // this runs — waiting for it also puts the scroll after the router's own
    // scroll reset. Give up if the visitor starts scrolling first; being yanked
    // down the page is worse than landing at the top.
    let request = 0;
    let cancelled = false;
    const deadline = performance.now() + 3000;

    const stop = () => {
      cancelAnimationFrame(request);
    };

    const settle = () => {
      if (cancelled) return;
      const form = formRef.current;
      if (form) {
        form.scrollIntoView({ block: "start", behavior: "instant" });
        // Also move the keyboard and screen-reader position, without scrolling
        // again. This holds on a direct page load; on a client-side navigation
        // the router reclaims focus afterwards, so it is a best effort and the
        // scroll above is what the visitor actually relies on.
        form.focus({ preventScroll: true });
        stop();
        return;
      }
      if (performance.now() < deadline) request = requestAnimationFrame(settle);
    };

    const abort = () => {
      cancelled = true;
      stop();
    };
    window.addEventListener("wheel", abort, { once: true, passive: true });
    window.addEventListener("touchstart", abort, { once: true, passive: true });
    request = requestAnimationFrame(settle);

    return () => {
      cancelled = true;
      stop();
      window.removeEventListener("wheel", abort);
      window.removeEventListener("touchstart", abort);
    };
  }, [arrivedFromCallToAction]);

  // A field is only validated live once the visitor has left it, so an error never
  // appears while they are still part-way through typing it.
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [lengths, setLengths] = useState<Record<string, number>>({ subject: presetSubject.length });

  function check(field: ContactField, value: string) {
    setErrors((current) => {
      const issue = validateField(field, value);
      const message = issue ? resolveContactMessage(dict, field, issue) : "";
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
    const issues = validateContact(
      Object.fromEntries(contactFieldNames.map((field) => [field, String(data.get(field) ?? "")])),
    );
    const found: Errors = {};
    for (const field of contactFieldNames) {
      const issue = issues[field];
      if (issue) found[field] = resolveContactMessage(dict, field, issue);
    }
    if (data.get("consent") !== "true") found.consent = dict.validation.consentRequired;
    setTouched(Object.fromEntries(contactFieldNames.map((field) => [field, true])));
    if (Object.keys(found).length > 0) {
      showError(copy.checkFields, found);
      return;
    }

    setBusy(true);
    setMessage("");
    setErrors({});
    try {
      const response = await fetch("/api/contact", { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok) {
        showError(result.message || copy.tryAgain, result.errors ?? {});
        return;
      }
      form.reset();
      setFileName(copy.noFile);
      setTouched({});
      setLengths({});
      setSent(true);
      setMessage(result.message);
      requestAnimationFrame(() => feedback.current?.focus());
    } catch {
      showError(copy.offline);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.enquiry} aria-labelledby="enquiry-heading">
      <div className={styles.inner}>
        <header className={styles.enquiryHeader} data-reveal>
          <div>
            <p className={styles.enquiryEyebrow}>{copy.eyebrow}</p>
            <h2 id="enquiry-heading">{copy.heading}</h2>
          </div>
          <p className={styles.enquiryIntro}>{copy.intro}</p>
        </header>
        <form id={enquiryFormId} ref={formRef} method="post" className={styles.form} data-reveal="zoom" tabIndex={-1} onSubmit={submit} aria-busy={busy} aria-describedby="submission-note">
          <div ref={feedback} tabIndex={-1} role={sent ? "status" : "alert"} className={message ? (sent ? styles.notice : styles.error) : undefined}>{message}</div>
          <fieldset disabled={busy} className={styles.fieldset}>
          <div className={styles.fields}>
            <div><label className={styles.srOnly} htmlFor="full-name">{copy.labels.fullName}</label><input id="full-name" name="fullName" autoComplete="name" placeholder={copy.labels.fullName} required {...liveProps("fullName")} />{errors.fullName && <p id="fullName-error" className={styles.fieldError}>{errors.fullName}</p>}</div>
            <div><label className={styles.srOnly} htmlFor="organisation">{copy.labels.organisation}</label><input id="organisation" name="organisation" autoComplete="organization" placeholder={copy.labels.organisation} {...liveProps("organisation")} />{errors.organisation && <p id="organisation-error" className={styles.fieldError}>{errors.organisation}</p>}</div>
            <div><label className={styles.srOnly} htmlFor="email">{copy.labels.email}</label><input id="email" name="email" type="email" autoComplete="email" placeholder={copy.labels.email} required {...liveProps("email")} />{errors.email && <p id="email-error" className={styles.fieldError}>{errors.email}</p>}</div>
            <div><label className={styles.srOnly} htmlFor="phone">{copy.labels.phone}</label><input id="phone" name="phone" type="tel" autoComplete="tel" placeholder={copy.labels.phone} required {...liveProps("phone")} />{errors.phone && <p id="phone-error" className={styles.fieldError}>{errors.phone}</p>}</div>
            <div><label className={styles.srOnly} htmlFor="location">{copy.labels.location}</label><input id="location" name="location" placeholder={copy.labels.location} {...liveProps("location")} />{errors.location && <p id="location-error" className={styles.fieldError}>{errors.location}</p>}</div>
            <div><label className={styles.srOnly} htmlFor="enquiry-type">{copy.labels.enquiryType}</label><select id="enquiry-type" name="enquiryType" defaultValue={presetType} required {...liveProps("enquiryType")}><option value="" disabled>{copy.labels.enquiryType}</option>{options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{errors.enquiryType && <p id="enquiryType-error" className={styles.fieldError}>{errors.enquiryType}</p>}</div>
            <div className={styles.fullWidth}><label className={styles.srOnly} htmlFor="subject">{copy.labels.subject}</label><input id="subject" name="subject" placeholder={copy.labels.subject} defaultValue={presetSubject} required {...liveProps("subject")} /><p className={styles.counter} aria-live="polite"><span dir="ltr">{lengths.subject ?? 0} / {contactFields.subject.maxLength}</span></p>{errors.subject && <p id="subject-error" className={styles.fieldError}>{errors.subject}</p>}</div>
            <div className={styles.fullWidth}><label className={styles.srOnly} htmlFor="message">{copy.labels.message}</label><textarea id="message" name="message" placeholder={copy.labels.message} rows={4} required {...liveProps("message")} /><p className={styles.counter} aria-live="polite"><span dir="ltr">{lengths.message ?? 0} / {contactFields.message.maxLength}</span></p>{errors.message && <p id="message-error" className={styles.fieldError}>{errors.message}</p>}</div>
            <div className={styles.fullWidth}><label className={styles.srOnly} htmlFor="portfolio">{copy.labels.portfolio}</label><input id="portfolio" name="portfolio" type="url" placeholder={copy.labels.portfolio} {...liveProps("portfolio")} />{errors.portfolio && <p id="portfolio-error" className={styles.fieldError}>{errors.portfolio}</p>}</div>
          </div>
          <div className={styles.attachment}>
            <label htmlFor="attachment">{copy.attachmentLabel}</label>
            <div className={styles.fileControl}>
              <span className={styles.fileName} aria-live="polite">{fileName}</span>
              <span className={styles.chooseFile} aria-hidden="true">{copy.chooseFile}</span>
              <input id="attachment" name="attachment" type="file" onChange={(event) => setFileName(event.currentTarget.files?.[0]?.name ?? copy.noFile)} aria-invalid={errors.attachment ? true : undefined} aria-describedby={errors.attachment ? "attachment-error" : undefined} />
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
            <span>{copy.consent}</span>
          </label>
          {errors.consent && <p id="consent-error" className={styles.fieldError}>{errors.consent}</p>}
          <button className={styles.send} type="submit">{busy ? copy.sending : copy.send}</button>
          </fieldset>
          <p id="submission-note" className={styles.note}>{copy.note}</p>
        </form>
      </div>
    </section>
  );
}
