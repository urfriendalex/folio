"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ArchiveEntry } from "@/content/archive/archive-data";
import { useIsTouchDevice } from "@/lib/useIsTouchDevice";
import styles from "./ArchiveCanvas.module.scss";

type SceneLoadState = {
  active: boolean;
  loaded: number;
  total: number;
};

function ArchiveLoadingStatus({
  loadState,
  ariaHidden = false,
}: {
  loadState?: SceneLoadState;
  ariaHidden?: boolean;
}) {
  const total = loadState?.total ?? 0;
  const loaded = loadState?.loaded ?? 0;
  const statusLabel = total > 0 && loaded > 0 ? "Loading archive..." : "Preparing archive...";

  return (
    <div
      className={styles.loadingStatus}
      aria-hidden={ariaHidden || undefined}
      aria-live={ariaHidden ? undefined : "polite"}
      aria-atomic={ariaHidden ? undefined : "true"}
      role={ariaHidden ? undefined : "status"}
    >
      <p className={styles.loadingText}>{statusLabel}</p>
    </div>
  );
}

const ArchiveCanvasScene = dynamic(
  () => import("./ArchiveCanvasScene").then((mod) => mod.ArchiveCanvasScene),
  {
    ssr: false,
    loading: () => (
      <div className={styles.scene} aria-hidden="true">
        <ArchiveLoadingStatus ariaHidden />
      </div>
    ),
  },
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
  const isTouchPrimary = useIsTouchDevice();
  const [hoveredLabel, setHoveredLabel] = useState<string>("");
  const [focusLabel, setFocusLabel] = useState<string>("");
  const [sceneLoadState, setSceneLoadState] = useState<SceneLoadState>({
    active: false,
    loaded: 0,
    total: 0,
  });
  const lastHoverLabelRef = useRef<string>("");
  const lastFocusLabelRef = useRef<string>("");

  const onHoverLabelChange = useCallback((label: string | null) => {
    const nextLabel = label ?? "";

    if (lastHoverLabelRef.current === nextLabel) {
      return;
    }

    lastHoverLabelRef.current = nextLabel;
    setHoveredLabel(nextLabel);
  }, []);

  const onFocusLabelChange = useCallback((label: string | null) => {
    const nextLabel = label ?? "";

    if (lastFocusLabelRef.current === nextLabel) {
      return;
    }

    lastFocusLabelRef.current = nextLabel;
    setFocusLabel(nextLabel);
  }, []);

  const activeLabel = isTouchPrimary ? focusLabel : hoveredLabel;

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("is-archive-route");

    return () => {
      html.classList.remove("is-archive-route");
    };
  }, []);

  return (
    <section
      className={styles.viewport}
      aria-busy={sceneLoadState.active}
      aria-label="Archive canvas"
      data-archive-experience="true"
    >
      <ArchiveCanvasScene
        items={items}
        onFocusLabelChange={onFocusLabelChange}
        onSceneLoadStateChange={setSceneLoadState}
        onHoverLabelChange={onHoverLabelChange}
      />

      <div className={styles.hud} aria-live="polite">
        {sceneLoadState.active ? <ArchiveLoadingStatus loadState={sceneLoadState} /> : null}
        {activeLabel ? (
          <span className={styles.focusLabel}>
            {fileNameFromArchivePath(activeLabel)}
          </span>
        ) : null}
      </div>
    </section>
  );
}
