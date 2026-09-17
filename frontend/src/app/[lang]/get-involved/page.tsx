import type { Metadata } from "next";
import Image from "next/image";
import { LocaleLink } from "@/components/i18n/locale-link";
import { enquiryHref } from "@/lib/validation/contact";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionary";
import styles from "@/components/get-involved/get-involved.module.css";

export async function generateMetadata(): Promise<Metadata> {
  return getDictionary(await getLocale()).meta.getInvolved;
}

/**
 * Every pathway leads somewhere. Most open the enquiry form with the type and
 * subject already set, so the visitor does not have to restate why they came;
 * the two that have a page of their own link to it instead. The subject travels
 * in the visitor's own language, which is the language they will be answered in.
 */
function pathwaysFor(dict: Dictionary) {
  const copy = dict.getInvolved.pathways;
  return [
    { ...copy.story, href: "/programs" },
    { ...copy.guest, href: enquiryHref("creative", copy.guest.subject) },
    { ...copy.creator, href: enquiryHref("creative", copy.creator.subject) },
    { ...copy.studio, href: enquiryHref("partnership", copy.studio.subject) },
    { ...copy.production, href: enquiryHref("creative", copy.production.subject) },
    { ...copy.programme, href: "/programs" },
    { ...copy.partner, href: enquiryHref("partnership", copy.partner.subject) },
  ];
}

function Arrow() {
  return <svg className={styles.arrow} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h16m-7-7 7 7-7 7" /></svg>;
}

export default async function GetInvolvedPage() {
  const dict = getDictionary(await getLocale());
  const copy = dict.getInvolved;
  const pathways = pathwaysFor(dict);

  return (
    <main id="main-content" tabIndex={-1}>
      <section className={styles.hero} aria-labelledby="involved-heading">
        <div className={styles.heroInner}>
          <Image src="/images/get-involved/hero/Sakafat-logo%202.svg" loading="eager" alt="" width={600} height={329} className={styles.artwork} data-enter="fade" />
          <div className={styles.heroCopy}>
            <h1 id="involved-heading" data-enter>{copy.headingLine1}<br />{copy.headingLine2}</h1>
            <p data-enter>{copy.intro}</p>
          </div>
          <p className={styles.guidance} data-enter>{copy.guidance}</p>
        </div>
      </section>
      <section className={styles.pathways} aria-labelledby="pathways-heading">
        <div className={styles.inner}>
          <header className={styles.sectionHeader} data-reveal>
            <div><p className={styles.eyebrow}>{copy.eyebrow}</p><h2 id="pathways-heading">{copy.pathwaysHeading}</h2></div>
            <p className={styles.intro}>{copy.pathwaysIntro}</p>
          </header>
          <div className={styles.accordions}>
            {pathways.map((pathway) => (
              <details className={styles.accordion} key={pathway.title} data-reveal>
                <summary><h3>{pathway.title}</h3><span className={styles.plus} aria-hidden="true" /></summary>
                <div className={styles.panel}>
                  <p>{pathway.description}</p>
                  <LocaleLink href={pathway.href} className={styles.action}>{pathway.action}<Arrow /></LocaleLink>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
      <section className={styles.participation} aria-labelledby="participation-note-heading">
        <div className={styles.note} data-reveal="zoom">
          <Image src="/images/get-involved/participation/bg-image.png" alt="" fill sizes="(max-width: 1199px) 100vw, 1140px" className={styles.noteImage} />
          <div className={styles.noteOverlay} aria-hidden="true" />
          <div className={styles.noteCopy}>
            <h2 id="participation-note-heading">{copy.noteHeading}</h2>
            <p>{copy.noteBody}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
