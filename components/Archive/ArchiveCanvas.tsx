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
  className,
}: {
  loadState?: SceneLoadState;
  ariaHidden?: boolean;
  className?: string;
}) {
  const total = loadState?.total ?? 0;
  const loaded = loadState?.loaded ?? 0;
  const statusLabel = total > 0 && loaded > 0 ? "Loading archive..." : "Preparing archive...";

  return (
    <div
      className={[styles.loadingStatus, className].filter(Boolean).join(" ")}
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
      <div className={styles.scene} aria-hidden="true" />
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
  const [sceneLoadState, setSceneLoadState] = useState<SceneLoadState | null>(null);
  /** After load completes, keep the overlay mounted briefly so it can blur/fade out like the site preloader. */
  const [loadingOverlayDismissed, setLoadingOverlayDismissed] = useState(false);
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

  const archiveBusy = sceneLoadState === null || sceneLoadState.active;
  const hideSceneUntilReady = archiveBusy;

  useEffect(() => {
    if (!archiveBusy) return;
    queueMicrotask(() => {
      setLoadingOverlayDismissed(false);
    });
  }, [archiveBusy]);

  useEffect(() => {
    if (archiveBusy || loadingOverlayDismissed) return;
    const id = window.setTimeout(() => setLoadingOverlayDismissed(true), 640);
    return () => window.clearTimeout(id);
  }, [archiveBusy, loadingOverlayDismissed]);

  const showLoadingOverlay = archiveBusy || !loadingOverlayDismissed;
  const loadingOverlayExiting = !archiveBusy && showLoadingOverlay;

  return (
    <section
      className={styles.viewport}
      aria-busy={archiveBusy}
      aria-label="Archive canvas"
      data-archive-experience="true"
    >
      <div
        className={`${styles.sceneShell} ${hideSceneUntilReady ? styles.sceneShellHidden : ""}`}
        aria-hidden={hideSceneUntilReady || undefined}
      >
        <ArchiveCanvasScene
          items={items}
          onFocusLabelChange={onFocusLabelChange}
          onSceneLoadStateChange={setSceneLoadState}
          onHoverLabelChange={onHoverLabelChange}
        />
      </div>

      <div className={styles.hud} aria-live="polite">
        {showLoadingOverlay ? (
          <ArchiveLoadingStatus
            ariaHidden={loadingOverlayExiting}
            className={loadingOverlayExiting ? styles.loadingStatusExiting : undefined}
            loadState={sceneLoadState ?? undefined}
          />
        ) : null}
        {!archiveBusy && activeLabel ? (
          <span className={styles.focusLabel}>
            {fileNameFromArchivePath(activeLabel)}
          </span>
        ) : null}
      </div>
    </section>
  );
}
