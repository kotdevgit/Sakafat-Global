"use client";

import Image from "next/image";
import { useState } from "react";
import cardStyles from "@/components/home/programs-section.module.css";
import styles from "./programs-content.module.css";

const filters = ["All Programmes", "Open Now", "Upcoming", "In Development"] as const;
type Filter = (typeof filters)[number];

const programs: { id: string; title: string; pillar: string; status: string; filter: Filter; description: string; action: string }[] = [
  { id: "signals", title: "Sakafat Signals 01.0", pillar: "Ikhlakiat", status: "Open", filter: "Open Now", description: "A bilingual cultural-media open call designed to discover emerging stories, creative ideas and cultural voices.", action: "Register Interest" },
  { id: "lawtency", title: "Lawtency", pillar: "Idraak", status: "In Development", filter: "In Development", description: "Accessible legal awareness and civic understanding through responsible public education and dialogue.", action: "View Details" },
  { id: "confidence", title: "Confidence Camp", pillar: "Falah", status: "Register Interest", filter: "Open Now", description: "Practical experiences designed to strengthen communication, confidence and meaningful participation.", action: "View Details" },
  { id: "career", title: "Career Rasta", pillar: "Rabta", status: "Upcoming", filter: "Upcoming", description: "Career direction, skills awareness and deliberate pathways into education, employment and enterprise.", action: "View Details" },
  { id: "minds", title: "MindsBehind", pillar: "Idraak", status: "In Development", filter: "In Development", description: "A proposed long-form format exploring cognition, resilience and the human stories behind important decisions.", action: "View Details" },
  { id: "sama", title: "Sakafat Sama", pillar: "Sama", status: "In Development", filter: "In Development", description: "A developing cultural production platform for Sufi and folk music, poetry and heritage performance.", action: "View Details" },
];

export function ProgramsDiscovery() {
  const [activeFilter, setActiveFilter] = useState<Filter>("All Programmes");
  const visiblePrograms = programs.filter((program) => activeFilter === "All Programmes" || program.filter === activeFilter);

  return (
    <section className={styles.discovery} aria-labelledby="discovery-heading">
      <div className={styles.inner}>
        <header className={styles.discoveryHeader}>
          <div><p className={styles.eyebrow}>Discovery</p><h2 id="discovery-heading" className={styles.heading}>Find the right programme.</h2></div>
          <p className={styles.approval}>Filter by current status. Details appear only after operational, legal and editorial approval.</p>
        </header>
        <div className={styles.filters} role="group" aria-label="Filter programmes by status">
          {filters.map((filter, index) => (
            <button key={filter} type="button" aria-pressed={activeFilter === filter} aria-controls="programme-results" onClick={() => setActiveFilter(filter)} className={styles.filter}>
              <Image src={`/images/programs/discovery/icon${index + 1}.svg`} alt="" width={17} height={17} />{filter}
            </button>
          ))}
        </div>
        <p className={styles.srOnly} role="status">{visiblePrograms.length} programmes shown: {activeFilter}.</p>
        <ul className={cardStyles.grid} id="programme-results">
          {visiblePrograms.map((program) => (
            <li key={program.id} className={`${cardStyles.card} ${cardStyles[program.id] ?? styles[program.id]}`}>
              <article className={cardStyles.program}>
                <div className={cardStyles.banner} aria-hidden="true">{program.title}</div>
                <div className={cardStyles.body}>
                  <span className={cardStyles.status}>{program.status}</span>
                  <h3>{program.title}</h3><p className={cardStyles.pillar}>{program.pillar}</p>
                  <p className={cardStyles.description}>{program.description}</p>
                  <button className={cardStyles.action} type="button" disabled aria-label={`${program.action}: ${program.title} — coming soon`} title="Coming soon">
                    {program.action}<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h16m-7-7 7 7-7 7" /></svg>
                  </button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
