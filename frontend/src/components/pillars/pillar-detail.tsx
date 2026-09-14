import Image from "next/image";
import Link from "next/link";
import { PillarsLink } from "@/components/layout/pillars-link";
import { ScrollToTop } from "./scroll-to-top";
import type { PillarDetail } from "./pillar-data";
import styles from "./pillar-detail.module.css";

function Arrow() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h16m-7-7 7 7-7 7" /></svg>;
}

export function PillarDetailPage({ pillar }: { pillar: PillarDetail }) {
  const assets = "/images/pillars/details/";
  return (
    <main id="main-content" tabIndex={-1}>
      <ScrollToTop />
      <section className={styles.hero} aria-labelledby="pillar-heading">
        <div className={styles.heroInner}>
          <Image src={assets + encodeURIComponent(pillar.artwork)} alt="" width={pillar.width} height={pillar.height} className={styles.artwork} loading="eager" />
          <div className={styles.heroContent}>
            <nav className={styles.breadcrumb} aria-label="Breadcrumb"><PillarsLink>Pillars</PillarsLink><span aria-hidden="true"> — </span><span aria-current="page">{pillar.name}</span></nav>
            <h1 id="pillar-heading">{pillar.name} — {pillar.meaning}</h1>
            <p>{pillar.introduction}</p>
            <div className={styles.actions}>
              <Link href="/get-involved" className={styles.primary}>Join Sakafat<Arrow /></Link>
              <Link href="/contact" className={styles.secondary}>Start a Conversation</Link>
            </div>
          </div>
        </div>
      </section>
      <section className={styles.foundation} aria-labelledby="foundation-heading">
        <div className={styles.foundationInner}>
          <div><p className={styles.eyebrow}>The Foundation</p><h2 id="foundation-heading">{pillar.meaning} as a seed of action.</h2><p className={styles.description}>{pillar.name} connects reflection with meaningful public work. It helps people examine context, build capability and participate with greater clarity and responsibility.</p></div>
          <Image src={assets + pillar.photo} alt={pillar.alt} width={580} height={350} sizes="(max-width: 767px) calc(100vw - 48px), (max-width: 1279px) 45vw, 580px" className={styles.photo} />
        </div>
      </section>
      <section className={styles.focus} aria-labelledby="focus-heading">
        <div className={styles.inner}>
          <p className={styles.eyebrow}>Focus Areas</p><h2 id="focus-heading">What {pillar.name} develops.</h2>
          <ol className={styles.cards}>
            {["Personal understanding", "Community connection", "Responsible action"].map((title, index) => (
              <li key={title}><span className={styles.number} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>Practical learning, dialogue and cultural work shaped by the purpose of {pillar.name}.</p></li>
            ))}
          </ol>
        </div>
      </section>
      <section className={styles.next} aria-labelledby="next-heading">
        <div className={styles.nextCard}><div><p className={styles.eyebrow}>Next step</p><h2 id="next-heading">Explore work connected to {pillar.name}.</h2></div><Link className={styles.primary} href="/programs">View Programmes<Arrow /></Link></div>
      </section>
    </main>
  );
}
