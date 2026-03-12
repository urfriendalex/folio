"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import styles from "./ArchivePage.module.scss";

type ArchiveItem = {
  src: string;
  width: number;
  height: number;
  kind: string;
};

type ArchivePageProps = {
  items: readonly ArchiveItem[];
};

const MIN_SCALE = 0.72;
const MAX_SCALE = 1.35;

function clampScale(value: number) {
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, value));
}

export function ArchivePage({ items }: ArchivePageProps) {
  const [scale, setScale] = useState(1);
  const doubledItems = [...items, ...items];

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className="section-eyebrow">Archive</span>
          <h1>archive</h1>
          <p>folder view. hold alt + scroll to zoom.</p>
        </div>
        <div className={`${styles.controls} panel-surface`}>
          <button
            type="button"
            className="pill-button"
            onClick={() => setScale((value) => clampScale(value - 0.08))}
          >
            out
          </button>
          <span className={styles.zoomLabel}>{Math.round(scale * 100)}%</span>
          <button
            type="button"
            className="pill-button"
            onClick={() => setScale((value) => clampScale(value + 0.08))}
          >
            in
          </button>
        </div>
      </section>

      <section
        className={`${styles.board} panel-surface`}
        onWheel={(event) => {
          if (!event.altKey) {
            return;
          }

          event.preventDefault();
          setScale((value) => clampScale(value - event.deltaY * 0.001));
        }}
        style={{ "--archive-scale": scale } as CSSProperties}
      >
        <div className={styles.grid}>
          {doubledItems.map((item, index) => (
            <div key={`${item.src}-${index}`} className={styles.tile}>
              <div className={styles.tileInner}>
                <Image
                  src={item.src}
                  alt=""
                  width={item.width}
                  height={item.height}
                  sizes="(max-width: 50rem) 45vw, (max-width: 64rem) 30vw, 22vw"
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
