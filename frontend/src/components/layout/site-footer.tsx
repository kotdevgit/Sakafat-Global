import Image from "next/image";
import Link from "next/link";
import styles from "./site-footer.module.css";

const groups = [
  { title: "Explore", links: ["Pillars", "Programmes", "About"] },
  { title: "Participate", links: ["Open pathways", "Creator network", "Partner with us"] },
  { title: "Governance", links: ["Editorial Charter", "Privacy Notice", "Accessibility"] },
];

const socials = [
  { name: "Instagram", image: "insta-icon.png", width: 14 },
  { name: "LinkedIn", image: "linkden-icon.png", width: 14 },
  { name: "Facebook", image: "fb-icon.png", width: 15 },
  { name: "X", image: "x-icon.png", width: 12 },
];

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.grid}>
          <div className={styles.brand}>
            <Link href="/" className={styles.logo} aria-label="Sakafat Global home">
              <Image src="/images/footer/logo.svg" alt="Sakafat Global" width={128} height={89} />
            </Link>
            <p className={styles.description}>A Pakistan-rooted cultural media and production company connecting stories, dialogue, creativity and opportunity.</p>
            <ul className={styles.socials} aria-label="Social media">
              {socials.map((social) => (
                <li key={social.name}>
                  <button type="button" disabled aria-label={`${social.name} — coming soon`} title={`${social.name} — coming soon`}>
                    <Image src={`/images/footer/${social.image}`} alt="" width={social.width} height={14} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {groups.map((group) => (
            <nav className={styles.column} aria-label={`Footer ${group.title}`} key={group.title}>
              <h2>{group.title}</h2>
              <ul>
                {group.links.map((label) => (
                  <li key={label}>{label === "Programmes" ? <Link href="/programs">{label}</Link> : <span aria-disabled="true" title={`${label} — coming soon`}>{label}</span>}</li>
                ))}
              </ul>
            </nav>
          ))}
          <div className={styles.column}>
            <h2>Contact</h2>
            <address className={styles.contact}>
              <p>info@sakafatglobal.com</p>
              <p>111 222 3333 00</p>
              <p>58 A2, Tipu Road, Gulberg 3<br />Lahore, Pakistan</p>
            </address>
          </div>
        </div>
        <p className={styles.copyright}>© 2026 Sakafat Global (Private) Limited. A private media and production company</p>
      </div>
    </footer>
  );
}
