"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import { format, type Dictionary } from "@/lib/i18n/dictionary";
import styles from "./about.module.css";

export function PublicPromises({ dict }: { dict: Dictionary }) {
  const copy = dict.about;
  const [openIndices, setOpenIndices] = useState<Set<number>>(new Set());

  const toggle = (index: number) => {
    setOpenIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <ol className={styles.promiseGrid}>
      {copy.promises.map((promise, index) => {
        const number = String(index + 1).padStart(2, "0");
        const isExpanded = openIndices.has(index);
        return (
          <li
            key={promise.title}
            className={`${styles.promiseCard} ${styles[`tone${index + 1}`]} ${isExpanded ? styles.expanded : ""}`}
            data-reveal
            style={{ "--reveal-index": index % 3 } as CSSProperties}
          >
            <Image src={`/images/about/public-promise/${number}.svg`} alt="" width={68} height={68} />
            <div className={styles.promiseBody}>
              <span className={styles.number} aria-hidden="true">{number}</span>
              <h3>{promise.title}</h3>
              <p className={styles.promiseText}>{promise.text}</p>
              <div
                id={`promise-detail-${number}`}
                className={styles.promiseDetail}
                aria-hidden={!isExpanded}
              >
                <div className={styles.promiseDetailInner}>
                  <p>{promise.detail}</p>
                </div>
              </div>
              <button
                type="button"
                className={styles.learn}
                onClick={() => toggle(index)}
                aria-expanded={isExpanded}
                aria-controls={`promise-detail-${number}`}
                aria-label={format(isExpanded ? copy.showLessAria : copy.learnMoreAria, { title: promise.title })}
              >
                {isExpanded ? copy.showLess : copy.learnMore}{" "}
                <span className={styles.toggleSymbol} aria-hidden="true">{isExpanded ? "−" : "+"}</span>
              </button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
