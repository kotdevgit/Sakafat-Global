"use client";

import Image from "next/image";
import { useState } from "react";
import { matchesFilter, programmeFilters, type Programme, type ProgrammeFilter } from "@/lib/api/programmes";
import { ProgrammeCard } from "./programme-card";
import cardStyles from "@/components/home/programs-section.module.css";
import styles from "./programs-content.module.css";

export function ProgramsDiscovery({ programmes }: { programmes: Programme[] }) {
  const [activeFilter, setActiveFilter] = useState<ProgrammeFilter>("All Programmes");
  const visiblePrograms = programmes.filter((programme) => matchesFilter(programme, activeFilter));

  return (
    <section className={styles.discovery} aria-labelledby="discovery-heading">
      <div className={styles.inner}>
        <header className={styles.discoveryHeader}>
          <div><p className={styles.eyebrow}>Discovery</p><h2 id="discovery-heading" className={styles.heading}>Find the right programme.</h2></div>
          <p className={styles.approval}>Filter by current status. Details appear only after operational, legal and editorial approval.</p>
        </header>
        <div className={styles.filters} role="group" aria-label="Filter programmes by status">
          {programmeFilters.map((filter, index) => (
            <button key={filter} type="button" aria-pressed={activeFilter === filter} aria-controls="programme-results" onClick={() => setActiveFilter(filter)} className={styles.filter}>
              <Image src={`/images/programs/discovery/icon${index + 1}.svg`} alt="" width={17} height={17} />{filter}
            </button>
          ))}
        </div>
        <p className={styles.srOnly} role="status">{visiblePrograms.length} programmes shown: {activeFilter}.</p>
        {visiblePrograms.length > 0 ? (
          <ul className={cardStyles.grid} id="programme-results">
            {visiblePrograms.map((programme) => (
              <ProgrammeCard key={programme.id} programme={programme} />
            ))}
          </ul>
        ) : (
          <p id="programme-results" className={styles.approval}>
            {programmes.length === 0
              ? "Programme details are being updated. Please check back shortly."
              : "No programmes match this filter right now."}
          </p>
        )}
      </div>
    </section>
  );
}
