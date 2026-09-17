"use client";

import Image from "next/image";
import { useState } from "react";
import { matchesFilter, programmeFilters, type Programme, type ProgrammeFilter } from "@/lib/api/programmes";
import { ProgrammeCard } from "./programme-card";
import { useI18n } from "@/lib/i18n/context";
import cardStyles from "@/components/home/programs-section.module.css";
import styles from "./programs-content.module.css";

export function ProgramsDiscovery({ programmes }: { programmes: Programme[] }) {
  const { dict, t } = useI18n();
  const copy = dict.programs.discovery;
  const [activeFilter, setActiveFilter] = useState<ProgrammeFilter>("All Programmes");
  const visiblePrograms = programmes.filter((programme) => matchesFilter(programme, activeFilter));

  return (
    <section className={styles.discovery} aria-labelledby="discovery-heading">
      <div className={styles.inner}>
        <header className={styles.discoveryHeader} data-reveal>
          <div><p className={styles.eyebrow}>{copy.eyebrow}</p><h2 id="discovery-heading" className={styles.heading}>{copy.heading}</h2></div>
          <p className={styles.approval}>{copy.approval}</p>
        </header>
        <div className={styles.filters} role="group" aria-label={copy.filterGroup} data-reveal="fade">
          {programmeFilters.map((filter, index) => (
            <button key={filter} type="button" aria-pressed={activeFilter === filter} aria-controls="programme-results" onClick={() => setActiveFilter(filter)} className={styles.filter}>
              <Image src={`/images/programs/discovery/icon${index + 1}.svg`} alt="" width={17} height={17} />{copy.filters[filter]}
            </button>
          ))}
        </div>
        <p className={styles.srOnly} role="status">
          {t(copy.resultCount, { count: visiblePrograms.length, filter: copy.filters[activeFilter] })}
        </p>
        {/*
          The list is keyed on the filter so React rebuilds it when one is picked
          and the entrance plays again: without the key the cards swap in place
          and the change reads as nothing having happened.
        */}
        {visiblePrograms.length > 0 ? (
          <ul className={`${cardStyles.grid} ${styles.results}`} id="programme-results" key={activeFilter} data-enter="fade">
            {visiblePrograms.map((programme, index) => (
              <ProgrammeCard key={programme.id} programme={programme} dict={dict} index={index} />
            ))}
          </ul>
        ) : (
          <p id="programme-results" className={styles.approval}>
            {programmes.length === 0 ? copy.empty : copy.noMatch}
          </p>
        )}
      </div>
    </section>
  );
}
