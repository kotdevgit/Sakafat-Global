import Image from "next/image";
import styles from "./pillars-section.module.css";

const pillars = [
  { name: "Idraak", question: "How do we understand?", description: "Mind nourishment. Bright ideas. Boundless minds.", flagship: "MindsBehind.", image: "p1.png", width: 159, height: 88, theme: "idraak", action: "Explore Idraak" },
  { name: "Rabta", question: "How do we connect?", description: "Connected people, collective power.", flagship: "Rabta Live.", image: "p2.png", width: 133, height: 92, theme: "rabta", action: "Explore Rabtaa" },
  { name: "Ikhlakiat", question: "How should we act?", description: "Work ethics ethics that empower.", flagship: "Lawtency.", image: "p3.png", width: 153, height: 76, theme: "ikhlakiat", action: "Explore Ikhlakiat" },
  { name: "Hayee Ya Lal Falah", question: "How do we build and progress?", description: "Business coaching: purpose driven growth, lasting impact.", flagship: "Falah Ki Kahani.", image: "p4.png", width: 148, height: 76, theme: "falah", action: "Explore Hayee Ya Lal Falah" },
  { name: "Sama", question: "What gives us depth and belonging?", description: "Where Pakistan’s living arts find their voice.", flagship: "Sama Session", image: "p5.png", width: 129, height: 97, theme: "sama", action: "Explore Sama" },
];

export function PillarsSection() {
  return (
    <section className={styles.section} aria-labelledby="pillars-heading">
      <div className={styles.inner}>
        <header className={styles.header}>
          <Image className={styles.artwork} src="/images/pillars/Pillars-artwork.png" alt="" width={276} height={81} />
          <p className={styles.eyebrow}>Five areas of work</p>
          <h2 id="pillars-heading">One signal, five pillars.</h2>
          <p className={styles.intro}>Each pillar carries its own tone, format and flagship program — sharing one purpose and one Editorial Charter.</p>
        </header>
        <ul className={styles.grid}>
          {pillars.map((pillar) => (
            <li className={`${styles.card} ${styles[pillar.theme]}`} key={pillar.theme}>
              <article className={styles.content}>
                <div className={styles.logo}>
                  <Image src={`/images/pillars/${pillar.image}`} alt="" width={pillar.width} height={pillar.height} />
                </div>
                <div className={styles.copy}>
                  <p className={styles.question}>{pillar.question}</p>
                  <div className={styles.description}><h3>{pillar.name}</h3>{" "}{pillar.description}<br />Flagship: {pillar.flagship}</div>
                </div>
                <button className={styles.explore} type="button" disabled title={`${pillar.name} page coming soon`}>
                  {pillar.action}
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m6 3 5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
