import Image from "next/image";
import { PillarsLink } from "@/components/layout/pillars-link";
import { LocaleLink } from "@/components/i18n/locale-link";
import { ScrollToTop } from "./scroll-to-top";
import { enquiryHref } from "@/lib/validation/contact";
import type { PillarDetail } from "./pillar-data";
import { getLocale } from "@/lib/i18n/server";
import { format, getDictionary } from "@/lib/i18n/dictionary";
import styles from "./pillar-detail.module.css";

function Arrow() {
  return <svg className={styles.arrow} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h16m-7-7 7 7-7 7" /></svg>;
}

export async function PillarDetailPage({ pillar }: { pillar: PillarDetail }) {
  const copy = getDictionary(await getLocale()).pillarDetail;
  const text = copy.pillars[pillar.slug];
  const assets = "/images/pillars/details/";
  const title = `${text.name}${copy.titleSeparator}${text.meaning}`;

  return (
    <main id="main-content" tabIndex={-1}>
      <ScrollToTop />
      <section className={styles.hero} aria-labelledby="pillar-heading">
        <div className={styles.heroInner}>
          <Image src={assets + encodeURIComponent(pillar.artwork)} alt="" width={pillar.width} height={pillar.height} className={styles.artwork} loading="eager" />
          <div className={styles.heroContent}>
            <nav className={styles.breadcrumb} aria-label={copy.breadcrumb}>
              <PillarsLink>{copy.pillarsLink}</PillarsLink>
              <span aria-hidden="true"> — </span>
              <span aria-current="page">{text.name}</span>
            </nav>
            <h1 id="pillar-heading">{title}</h1>
            <p>{text.introduction}</p>
            <div className={styles.actions}>
              <LocaleLink href="/get-involved" className={styles.primary}>{copy.joinSakafat}<Arrow /></LocaleLink>
              <LocaleLink href={enquiryHref("general", title)} className={styles.secondary}>{copy.startConversation}</LocaleLink>
            </div>
          </div>
        </div>
      </section>
      <section className={styles.foundation} aria-labelledby="foundation-heading">
        <div className={styles.foundationInner}>
          <div>
            <p className={styles.eyebrow}>{copy.foundationEyebrow}</p>
            <h2 id="foundation-heading">{format(copy.foundationHeading, { meaning: text.meaning })}</h2>
            <p className={styles.description}>{format(copy.foundationBody, { name: text.name })}</p>
          </div>
          <Image src={assets + pillar.photo} alt={text.photoAlt} width={580} height={350} sizes="(max-width: 767px) calc(100vw - 48px), (max-width: 1279px) 45vw, 580px" className={styles.photo} />
        </div>
      </section>
      <section className={styles.focus} aria-labelledby="focus-heading">
        <div className={styles.inner}>
          <p className={styles.eyebrow}>{copy.focusEyebrow}</p>
          <h2 id="focus-heading">{format(copy.focusHeading, { name: text.name })}</h2>
          <ol className={styles.cards}>
            {copy.focusCards.map((title, index) => (
              <li key={title}>
                <span className={styles.number} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <h3>{title}</h3>
                <p>{format(copy.focusBody, { name: text.name })}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className={styles.next} aria-labelledby="next-heading">
        <div className={styles.nextCard}>
          <div>
            <p className={styles.eyebrow}>{copy.nextEyebrow}</p>
            <h2 id="next-heading">{format(copy.nextHeading, { name: text.name })}</h2>
          </div>
          <LocaleLink className={styles.primary} href="/programs">{copy.viewProgrammes}<Arrow /></LocaleLink>
        </div>
      </section>
    </main>
  );
}
