"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ArchiveEntry } from "@/content/archive/archive-data";
import { useIsTouchDevice } from "@/lib/useIsTouchDevice";
import styles from "./ArchiveCanvas.module.scss";

const PREPARING_EXIT_MS = 640;
/** Visible time before the interaction hint begins to fade out */
const HINT_VISIBLE_MS = 4000;
const HINT_FADE_MS = 420;

type SceneLoadState = {
  active: boolean;
  loaded: number;
  total: number;
};

function ArchivePreparingOverlay({
  ariaHidden = false,
  className,
}: {
  ariaHidden?: boolean;
  className?: string;
}) {
  return (
    <div
      className={[styles.preparingOverlay, className].filter(Boolean).join(" ")}
      aria-hidden={ariaHidden || undefined}
      aria-live={ariaHidden ? undefined : "polite"}
      aria-atomic={ariaHidden ? undefined : "true"}
      role={ariaHidden ? undefined : "status"}
    >
      <p className={styles.preparingText}>Preparing archive...</p>
    </div>
  );
}

function ArchiveAssetsLoadingIndicator() {
  return (
    <div className={styles.assetsLoadingIndicator}>
      <p className={styles.assetsLoadingText} role="status" aria-live="polite">
        <span className={styles.assetsLoadingLabel}>Loading</span>
        <span className={styles.loadingDots} aria-hidden="true">
          <span className={styles.loadingDot} />
          <span className={styles.loadingDot} />
          <span className={styles.loadingDot} />
        </span>
      </p>
    </div>
  );
}

function ArchiveInteractionHint({
  exiting,
  ariaHidden = false,
}: {
  exiting: boolean;
  ariaHidden?: boolean;
}) {
  return (
    <div
      aria-hidden={ariaHidden || undefined}
      aria-live={ariaHidden ? undefined : "polite"}
      className={[styles.interactionHint, exiting ? styles.interactionHintExiting : ""]
        .filter(Boolean)
        .join(" ")}
      role={ariaHidden ? undefined : "status"}
    >
      <p className={styles.interactionHintText}>Drag and scroll to explore</p>
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
  /** Lets the preparing overlay play its exit animation after the scene begins reporting load progress. */
  const [preparingOverlayDismissed, setPreparingOverlayDismissed] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const [hintExiting, setHintExiting] = useState(false);
  const hintPlayedRef = useRef(false);
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

  const isPreparing = sceneLoadState === null;
  const assetsStillLoading = sceneLoadState?.active === true;
  const experienceReady = sceneLoadState !== null && !sceneLoadState.active;

  const hideSceneUntilReady = isPreparing;

  useEffect(() => {
    if (!isPreparing) return;
    queueMicrotask(() => {
      setPreparingOverlayDismissed(false);
    });
  }, [isPreparing]);

  useEffect(() => {
    if (isPreparing || preparingOverlayDismissed) return;
    const id = window.setTimeout(() => setPreparingOverlayDismissed(true), PREPARING_EXIT_MS);
    return () => window.clearTimeout(id);
  }, [isPreparing, preparingOverlayDismissed]);

  const showPreparingOverlay = isPreparing || !preparingOverlayDismissed;
  const preparingOverlayExiting = !isPreparing && showPreparingOverlay;

  useEffect(() => {
    if (!experienceReady || hintPlayedRef.current) return;
    if (sceneLoadState && sceneLoadState.total === 0) return;

    hintPlayedRef.current = true;

    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const visibleMs = reducedMotion ? 1800 : HINT_VISIBLE_MS;
    const fadeMs = reducedMotion ? 160 : HINT_FADE_MS;

    const showId = window.setTimeout(() => {
      setHintVisible(true);
      setHintExiting(false);
    }, 0);

    const fadeId = window.setTimeout(() => setHintExiting(true), visibleMs);
    const hideId = window.setTimeout(() => {
      setHintVisible(false);
      setHintExiting(false);
    }, visibleMs + fadeMs);

    return () => {
      window.clearTimeout(showId);
      window.clearTimeout(fadeId);
      window.clearTimeout(hideId);
    };
  }, [experienceReady, sceneLoadState]);

  return (
    <section
      className={styles.viewport}
      aria-busy={isPreparing}
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
        {sceneLoadState !== null && activeLabel ? (
          <span className={styles.focusLabel}>
            {fileNameFromArchivePath(activeLabel)}
          </span>
        ) : null}
        {hintVisible ? (
          <ArchiveInteractionHint
            ariaHidden={hintExiting}
            exiting={hintExiting}
          />
        ) : null}
        {assetsStillLoading ? <ArchiveAssetsLoadingIndicator /> : null}
        {showPreparingOverlay ? (
          <ArchivePreparingOverlay
            ariaHidden={preparingOverlayExiting}
            className={preparingOverlayExiting ? styles.preparingOverlayExiting : undefined}
          />
        ) : null}
      </div>
    </section>
  );
}
