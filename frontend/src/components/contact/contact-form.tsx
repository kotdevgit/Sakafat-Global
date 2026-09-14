"use client";

import { useState } from "react";
import styles from "./contact.module.css";

export function ContactForm() {
  const [fileName, setFileName] = useState("No file selected");
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
        <form id="enquiry-form" className={styles.form} tabIndex={-1} onSubmit={(event) => event.preventDefault()} aria-describedby="submission-note">
          <div className={styles.fields}>
            <div><label className={styles.srOnly} htmlFor="full-name">Full Name</label><input id="full-name" name="fullName" autoComplete="name" placeholder="Full Name" required /></div>
            <div><label className={styles.srOnly} htmlFor="organisation">Organisation</label><input id="organisation" name="organisation" autoComplete="organization" placeholder="Organisation" /></div>
            <div><label className={styles.srOnly} htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" placeholder="Email address" required /></div>
            <div><label className={styles.srOnly} htmlFor="phone">Phone number</label><input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="Phone number" /></div>
            <div><label className={styles.srOnly} htmlFor="location">Country and city</label><input id="location" name="location" placeholder="Country and city" /></div>
            <div><label className={styles.srOnly} htmlFor="enquiry-type">Enquiry type</label><select id="enquiry-type" name="enquiryType" defaultValue="" required><option value="" disabled>Enquiry type</option><option value="general">General enquiry</option><option value="programmes">Programmes and participation</option><option value="creative">Creative collaboration</option><option value="partnership">Partnership enquiry</option><option value="media">Media enquiry</option></select></div>
            <div className={styles.fullWidth}><label className={styles.srOnly} htmlFor="subject">Subject</label><input id="subject" name="subject" placeholder="Subject" required /></div>
            <div className={styles.fullWidth}><label className={styles.srOnly} htmlFor="message">Message</label><textarea id="message" name="message" placeholder="Message" rows={4} required /></div>
            <div className={styles.fullWidth}><label className={styles.srOnly} htmlFor="portfolio">Relevant link or portfolio</label><input id="portfolio" name="portfolio" type="url" placeholder="Relevant link or portfolio" /></div>
          </div>
          <div className={styles.attachment}>
            <label htmlFor="attachment">Attachment (optional)</label>
            <div className={styles.fileControl}>
              <span className={styles.fileName} aria-live="polite">{fileName}</span>
              <span className={styles.chooseFile} aria-hidden="true">Choose file</span>
              <input id="attachment" name="attachment" type="file" onChange={(event) => setFileName(event.currentTarget.files?.[0]?.name ?? "No file selected")} />
            </div>
          </div>
          <label className={styles.consent}>
            <input name="consent" type="checkbox" required />
            <span>I agree that Sakafat Global may use these details to respond to my enquiry. This does not create any partnership, engagement or contractual commitment.</span>
          </label>
          <button className={styles.send} type="submit" disabled>Send inquiry</button>
          <p id="submission-note" className={styles.note}>Enquiry submission is not available yet. Your details and attachments are not sent or saved.</p>
        </form>
      </div>
    </section>
  );
}
