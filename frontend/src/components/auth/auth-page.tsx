import Image from "next/image";
import { AuthForm } from "./auth-form";
import styles from "./auth.module.css";

export function AuthPage({ mode }: { mode: "login" | "register" | "verify" }) {
  return <main id="main-content" tabIndex={-1} className={styles.page}>
    <div className={styles.layout}>
      <aside className={styles.story}>
        <Image src="/images/get-involved/hero/Sakafat-logo%202.svg" alt="" fill sizes="(max-width: 767px) 100vw, 50vw" className={styles.artwork} loading="eager" />
        <div className={styles.storyContent}>
          <p className={styles.eyebrow}>Sakafat Global</p>
          <h2>Your voice.<br />Our shared culture.</h2>
          <p>A place for stories, dialogue, creativity and connection.</p>
          <div className={styles.signature}>Art. Culture. Heritage.</div>
        </div>
      </aside>
      <section className={styles.card} aria-labelledby="auth-heading"><AuthForm mode={mode} /></section>
    </div>
  </main>;
}
