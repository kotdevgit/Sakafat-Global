import Image from "next/image";
import { getOpenProgramme } from "@/lib/api/programmes";
import { LocaleLink } from "@/components/i18n/locale-link";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionary";
import styles from "./incoming-section.module.css";

export async function IncomingSection() {
  // Point at whichever programme is open rather than a fixed slug, so the call to
  // action follows the admin. With nothing open it falls back to the full listing.
  const [open, dict] = await Promise.all([getOpenProgramme(), getLocale().then(getDictionary)]);
  const href = open ? `/programs/${open.slug}` : "/programs";
  const copy = dict.home.incoming;

  return (
    <section className={styles.section} aria-labelledby="incoming-heading">
      <div className={styles.banner} data-reveal>
        <Image src="/images/incoming/bg-img.png" alt="" fill sizes="(max-width: 1376px) 100vw, 1280px" className={styles.background} />
        <div className={styles.overlay} aria-hidden="true" />
        <svg className={styles.soundwave} viewBox="0 0 360 120" fill="none" aria-hidden="true">
          <path d="M8 56v8m12-16v24m12-32v40m12-48v56m12-64v72m12-86v100m12-88v76m12-66v56m12-44v32m12-24v16M224 56v8m12-20v32m12-46v60m12-80v100m12-90v80m12-66v52m12-42v32m12-24v16m12-12v8" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
          <rect x="145" y="8" width="46" height="74" rx="23" stroke="currentColor" strokeWidth="4" />
          <path d="M135 58v8a33 33 0 0 0 66 0v-8m-33 41v17m-18 0h36M148 26h40m-40 10h40m-40 10h40m-40 10h40m-38 10h36" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <Image src="/images/incoming/sakafat.png" alt="" width={328} height={219} className={styles.watermark} />
        <div className={styles.content}>
          <div className={styles.message}>
            <h2 id="incoming-heading">{copy.heading}</h2>{" "}
            <p>{copy.body}</p>
          </div>
          <LocaleLink className={styles.submit} href={href}>{copy.submit}</LocaleLink>
        </div>
      </div>
    </section>
  );
}
