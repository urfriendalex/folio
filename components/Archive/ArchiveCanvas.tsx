"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ArchiveEntry } from "@/content/archive/archive-data";
import { useIsTouchDevice } from "@/lib/useIsTouchDevice";
import styles from "./ArchiveCanvas.module.scss";

const PREPARING_EXIT_MS = 640;
/** Visible time before the interaction hint begins to fade out */
const HINT_VISIBLE_MS = 3200;
const HINT_FADE_MS = 336;
const ASSET_LOADING_LINE_MS = 2600;
const ASSET_LOADING_EXIT_MS = 180;
const ASSET_LOADING_LINES = [
  "Loading media",
  "Fetching fragments",
  "Unpacking studies",
  "Developing stills",
  "Warming the canvas",
  "Assembling the pile",
] as const;
const ASSET_LOADING_LINE_SIZER = ASSET_LOADING_LINES.reduce((longest, line) =>
  line.length >= longest.length ? line : longest,
);

type SceneLoadState = {
  active: boolean;
  loaded: number;
  total: number;
};

function LoadingDots() {
  return (
    <span className={styles.loadingDots} aria-hidden="true">
      <span className={styles.loadingDot} />
      <span className={styles.loadingDot} />
      <span className={styles.loadingDot} />
    </span>
  );
}

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
      <p className={styles.preparingText}>
        <span className={styles.assetsLoadingLabel}>Preparing archive</span>
        <LoadingDots />
      </p>
    </div>
  );
}

function ArchiveAssetsLoadingIndicator() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [outgoingIndex, setOutgoingIndex] = useState<number | null>(null);
  const [incomingSettled, setIncomingSettled] = useState(true);
  const activeIndexRef = useRef(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      return;
    }

    const timerId = window.setInterval(() => {
      const previous = activeIndexRef.current;
      const next = (previous + 1) % ASSET_LOADING_LINES.length;
      activeIndexRef.current = next;
      setOutgoingIndex(previous);
      setIncomingSettled(false);
      setActiveIndex(next);
    }, ASSET_LOADING_LINE_MS);

    return () => window.clearInterval(timerId);
  }, []);

  useLayoutEffect(() => {
    if (incomingSettled) {
      return;
    }

    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        setIncomingSettled(true);
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [activeIndex, incomingSettled]);

  useEffect(() => {
    if (outgoingIndex === null) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setOutgoingIndex(null);
    }, ASSET_LOADING_EXIT_MS);

    return () => window.clearTimeout(timerId);
  }, [outgoingIndex]);

  return (
    <div className={styles.assetsLoadingIndicator}>
      <p className={styles.assetsLoadingText} role="status">
        <span className="sr-only">Loading archive media</span>
        <span className={styles.assetsLoadingLineStack} aria-hidden="true">
          <span className={styles.assetsLoadingLineSizer}>
            {ASSET_LOADING_LINE_SIZER}
            <LoadingDots />
          </span>
          {outgoingIndex !== null ? (
            <span className={styles.assetsLoadingLine} data-state="out">
              {ASSET_LOADING_LINES[outgoingIndex]}
              <LoadingDots />
            </span>
          ) : null}
          <span
            className={styles.assetsLoadingLine}
            data-state={incomingSettled ? "in" : "enter"}
          >
            {ASSET_LOADING_LINES[activeIndex]}
            <LoadingDots />
          </span>
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
      <p className={styles.interactionHintText}>drag, scroll, zoom, explore, have fun</p>
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
  const viewportRef = useRef<HTMLElement | null>(null);

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

  useEffect(() => {
    const navbar = document.querySelector<HTMLElement>("[data-app-navbar='true']");
    const host = viewportRef.current;
    if (!navbar || !host) {
      return;
    }

    const home = navbar.parentElement;
    const marker = document.createComment("folio-navbar-home");
    home?.insertBefore(marker, navbar);
    host.appendChild(navbar);

    return () => {
      if (marker.parentNode) {
        marker.parentNode.insertBefore(navbar, marker);
        marker.parentNode.removeChild(marker);
      }
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
    const visibleMs = reducedMotion ? 1440 : HINT_VISIBLE_MS;
    const fadeMs = reducedMotion ? 128 : HINT_FADE_MS;

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
      ref={viewportRef}
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
