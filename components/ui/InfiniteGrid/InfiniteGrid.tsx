"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import styles from "./InfiniteGrid.module.scss";

type ArchiveItem = {
  id: string;
  image: string;
  width: number;
  height: number;
  title: string;
  year?: string;
};

type InfiniteGridProps = {
  items: ArchiveItem[];
};

const INITIAL_BATCH = 12;
const LOAD_BATCH = 6;

export function InfiniteGrid({ items }: InfiniteGridProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sentinelNode = sentinelRef.current;

    if (!sentinelNode) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) {
          return;
        }

        setVisibleCount((count) => Math.min(count + LOAD_BATCH, items.length));
      },
      { rootMargin: "0px 0px 400px 0px" },
    );

    observer.observe(sentinelNode);

    return () => observer.disconnect();
  }, [items.length]);

  const visibleItems = items.slice(0, visibleCount);

  return (
    <div className={styles.grid}>
      {visibleItems.map((item) => (
        <figure key={item.id} className={styles.item}>
          <Image
            src={item.image}
            alt={item.title}
            width={item.width}
            height={item.height}
            sizes="(max-width: 48rem) 48vw, (max-width: 72rem) 31vw, 22vw"
          />
          <figcaption className={styles.caption}>
            <span>{item.title}</span>
            {item.year ? <span>{item.year}</span> : null}
          </figcaption>
        </figure>
      ))}
      <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />
    </div>
  );
}
