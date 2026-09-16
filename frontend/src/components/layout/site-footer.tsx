import Image from "next/image";
import { PillarsLink } from "./pillars-link";
import { LocaleLink } from "@/components/i18n/locale-link";
import styles from "./site-footer.module.css";
import { enquiryHref } from "@/lib/validation/contact";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary, format } from "@/lib/i18n/dictionary";

const socials = [
  { name: "Instagram", image: "insta-icon.png", width: 14 },
  { name: "LinkedIn", image: "linkden-icon.png", width: 14 },
  { name: "Facebook", image: "fb-icon.png", width: 15 },
  { name: "X", image: "x-icon.png", width: 12 },
];

export async function SiteFooter() {
  const dict = getDictionary(await getLocale());
  const { footer, common } = dict;

  /** A destination that has no page yet is named but not linked. */
  const pending = (label: string) => (
    <span aria-disabled="true" title={`${label} — ${common.comingSoon}`}>{label}</span>
  );

  const columns = [
    {
      title: footer.explore.title,
      items: [
        <PillarsLink key="pillars">{footer.explore.pillars}</PillarsLink>,
        <LocaleLink key="programmes" href="/programs">{footer.explore.programmes}</LocaleLink>,
        <LocaleLink key="about" href="/about">{footer.explore.about}</LocaleLink>,
      ],
    },
    {
      title: footer.participate.title,
      items: [
        <LocaleLink key="pathways" href="/get-involved">{footer.participate.openPathways}</LocaleLink>,
        pending(footer.participate.creatorNetwork),
        <LocaleLink key="partner" href={enquiryHref("partnership", footer.partnershipSubject)}>
          {footer.participate.partnerWithUs}
        </LocaleLink>,
      ],
    },
    {
      title: footer.governance.title,
      items: [
        pending(footer.governance.editorialCharter),
        pending(footer.governance.privacyNotice),
        pending(footer.governance.accessibility),
      ],
    },
  ];

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.grid}>
          <div className={styles.brand}>
            <LocaleLink href="/" className={styles.logo} aria-label={footer.homeAria}>
              <Image src="/images/footer/logo.svg" alt={common.logoAlt} width={128} height={89} />
            </LocaleLink>
            <p className={styles.description}>{footer.description}</p>
            <ul className={styles.socials} aria-label={footer.socials}>
              {socials.map((social) => (
                <li key={social.name}>
                  <button
                    type="button"
                    disabled
                    aria-label={`${social.name} — ${common.comingSoon}`}
                    title={`${social.name} — ${common.comingSoon}`}
                  >
                    <Image src={`/images/footer/${social.image}`} alt="" width={social.width} height={14} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {columns.map((column) => (
            <nav className={styles.column} aria-label={format(footer.columnAria, { title: column.title })} key={column.title}>
              <h2>{column.title}</h2>
              <ul>
                {column.items.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </nav>
          ))}
          <div className={styles.column}>
            <h2>{footer.contact.title}</h2>
            <address className={styles.contact}>
              <p>{footer.contact.email}</p>
              <p>{footer.contact.phone}</p>
              <p>{footer.contact.addressLine1}<br />{footer.contact.addressLine2}</p>
            </address>
          </div>
        </div>
        <p className={styles.copyright}>{footer.copyright}</p>
      </div>
    </footer>
  );
}
