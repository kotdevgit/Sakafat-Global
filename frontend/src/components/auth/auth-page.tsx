import Image from "next/image";
import { AuthForm } from "./auth-form";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionary";
import styles from "./auth.module.css";

export async function AuthPage({ mode }: { mode: "login" | "register" | "forgot-password" }) {
  const copy = getDictionary(await getLocale()).auth.story;
  return <main id="main-content" tabIndex={-1} className={styles.page}>
    <div className={styles.layout}>
      <aside className={styles.story}>
        <Image src="/images/get-involved/hero/Sakafat-logo%202.svg" alt="" fill sizes="(max-width: 767px) 100vw, 50vw" className={styles.artwork} loading="eager" />
        <div className={styles.storyContent}>
          <p className={styles.eyebrow} data-enter>{copy.eyebrow}</p>
          <h2 data-enter>{copy.headingLine1}<br />{copy.headingLine2}</h2>
          <p data-enter>{copy.body}</p>
          <div className={styles.signature} data-enter>{copy.signature}</div>
        </div>
      </aside>
      <section className={styles.card} aria-labelledby="auth-heading"><AuthForm mode={mode} /></section>
    </div>
  </main>;
}
