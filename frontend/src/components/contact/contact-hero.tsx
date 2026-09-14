import Image from "next/image";
import styles from "./contact.module.css";

export function ContactHero() {
  return (
    <section className={styles.hero} aria-labelledby="contact-heading">
      <Image src="/images/contact/hero/bg.png" alt="" fill preload sizes="100vw" className={styles.background} />
      <div className={styles.heroInner}>
        <p className={styles.eyebrow}>Contact Us</p>
        <h1 id="contact-heading">Start the right<br />conversation</h1>
        <p className={styles.intro}>Tell us what brings you here, and we’ll route it straight to the team built to answer it.</p>
        <a href="#enquiry-form" className={styles.getStarted}>Get Started</a>
      </div>
    </section>
  );
}
