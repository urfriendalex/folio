"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ArchiveEntry } from "@/content/archive/archive-data";
import styles from "./ArchiveCanvas.module.scss";
import type { HoveredArchivePlane } from "./ArchiveCanvasScene";

const ArchiveCanvasScene = dynamic(
  () => import("./ArchiveCanvasScene").then((mod) => mod.ArchiveCanvasScene),
  { ssr: false, loading: () => <div className={styles.scene} aria-hidden="true" /> },
);

type ArchiveCanvasProps = {
  items: ArchiveEntry[];
};

function fileNameFromArchivePath(path: string) {
  const trimmed = path.replace(/\/+$/, "");
  const segment = trimmed.split("/").pop() ?? trimmed;
  return segment || path;
}

export function ArchiveCanvas({ items }: ArchiveCanvasProps) {
  const [hoveredPlane, setHoveredPlane] = useState<HoveredArchivePlane | null>(null);
  const lastHoverKeyRef = useRef<string | null>(null);

  const onHoverChange = useCallback((plane: HoveredArchivePlane | null) => {
    const key = plane
      ? `${plane.item.image}|${plane.chunkX}|${plane.chunkY}|${plane.chunkZ}`
      : null;

    if (lastHoverKeyRef.current === key) {
      return;
    }

    lastHoverKeyRef.current = key;
    setHoveredPlane(plane);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("is-archive-route");

    return () => {
      html.classList.remove("is-archive-route");
    };
  }, []);

  const focusLabel = hoveredPlane
    ? fileNameFromArchivePath(hoveredPlane.item.image)
    : "";

  return (
    <section className={styles.viewport} aria-label="Archive canvas">
      <ArchiveCanvasScene items={items} onHoverChange={onHoverChange} />

      <div className={styles.hud} aria-live="polite">
        {focusLabel ? (
          <span className={styles.focusLabel}>{focusLabel}</span>
        ) : null}
      </div>
    </section>
  );
}
