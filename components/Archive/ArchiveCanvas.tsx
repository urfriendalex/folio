"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ArchiveEntry } from "@/content/archive/archive-data";
import styles from "./ArchiveCanvas.module.scss";

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
  const [hoveredLabel, setHoveredLabel] = useState<string>("");
  const lastHoverLabelRef = useRef<string>("");

  const onHoverLabelChange = useCallback((label: string | null) => {
    const nextLabel = label ?? "";

    if (lastHoverLabelRef.current === nextLabel) {
      return;
    }

    lastHoverLabelRef.current = nextLabel;
    setHoveredLabel(nextLabel);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("is-archive-route");

    return () => {
      html.classList.remove("is-archive-route");
    };
  }, []);

  return (
    <section className={styles.viewport} aria-label="Archive canvas">
      <ArchiveCanvasScene
        items={items}
        onHoverLabelChange={onHoverLabelChange}
      />

      <div className={styles.hud} aria-live="polite">
        {hoveredLabel ? (
          <span className={styles.focusLabel}>
            {fileNameFromArchivePath(hoveredLabel)}
          </span>
        ) : null}
      </div>
    </section>
  );
}
