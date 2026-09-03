"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import ASCIIAnimation from "./ascii";
import { getFrameFolderForTheme, getInitialFrameFolder } from "./frameFolder";
import styles from "./preloader.module.scss";
import { usePreloaderAssets } from "./usePreloaderAssets";

type PreloaderProps = {
  onDone: () => void;
};

const PROGRESS_SMOOTHING = 0.08;
const COMPLETION_COUNTUP_MS = 420;
const HOLD_AT_100_MS = 480;
const REDUCED_MOTION_COUNTUP_MS = 160;
const REDUCED_MOTION_HOLD_MS = 160;
const EXIT_TIMEOUT_MS = 1200;
const ENTER_DURATION_MS = 320;
const ASCII_SCALE = 1;

export function Preloader({ onDone }: PreloaderProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef<HTMLSpanElement | null>(null);

  const [frameFolder, setFrameFolder] = useState(getInitialFrameFolder);
  const [isAsciiReady, setIsAsciiReady] = useState(false);
  const [hasStartedAssetLoading, setHasStartedAssetLoading] = useState(false);
  const { actualProgressRef, isCompleteRef } = usePreloaderAssets(hasStartedAssetLoading);
  const handleAsciiReady = useCallback(() => {
    setIsAsciiReady(true);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const syncThemeFolder = () => {
      setFrameFolder(getFrameFolderForTheme(html.getAttribute("data-theme")));
    };

    syncThemeFolder();

    const observer = new MutationObserver(syncThemeFolder);
    observer.observe(html, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const shouldRun = html.getAttribute("data-preloader") === "run";

    if (!shouldRun || !isAsciiReady || hasStartedAssetLoading) {
      return;
    }

    const startTimer = window.setTimeout(() => {
      setHasStartedAssetLoading(true);
    }, ENTER_DURATION_MS);

    return () => {
      window.clearTimeout(startTimer);
    };
  }, [isAsciiReady, hasStartedAssetLoading]);

  useLayoutEffect(() => {
    const overlayNode = overlayRef.current;
    const progressNode = progressRef.current;

    if (!overlayNode || !progressNode) {
      return;
    }

    const html = document.documentElement;
    const shouldRun = html.getAttribute("data-preloader") === "run";

    if (!shouldRun) {
      onDone();
      return;
    }

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const prefersReducedMotion = motionQuery.matches;

    let rafId: number | null = null;
    let exitFallbackTimer: number | null = null;
    let isExiting = false;
    let didFinalize = false;
    let displayedProgress = 0;
    let completionFrom = 0;
    let completionStartedAt: number | null = null;
    let heldAtCompleteSince: number | null = null;

    const setProgressText = (value: number, allowComplete = false) => {
      const clamped = Math.max(0, Math.min(1, value));
      const percent = allowComplete
        ? Math.round(clamped * 100)
        : Math.min(99, Math.round(clamped * 100));
      progressNode.textContent = `${percent}%`;
      progressNode.dataset.progress = String(percent);
      overlayNode.dataset.preloaderComplete = percent >= 100 ? "true" : "false";
    };

    if (!hasStartedAssetLoading) {
      html.classList.add("is-loading");
      html.classList.remove("is-preloader-exiting");
      setProgressText(0);
      return;
    }

    const beginPreloaderExit = () => {
      if (isExiting) {
        return;
      }

      isExiting = true;

      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }

      displayedProgress = 1;
      setProgressText(1, true);

      overlayNode.classList.add(styles.isLoaded);
      html.classList.add("is-preloader-exiting");
      if (prefersReducedMotion) {
        overlayNode.classList.add(styles.reducedMotionExit);
      }

      const cleanup = () => {
        if (didFinalize) {
          return;
        }

        didFinalize = true;

        if (exitFallbackTimer !== null) {
          window.clearTimeout(exitFallbackTimer);
          exitFallbackTimer = null;
        }

        html.classList.remove("is-loading");
        html.classList.remove("is-preloader-exiting");
        html.setAttribute("data-preloader", "skip");

        try {
          sessionStorage.setItem("preloaded", "true");
        } catch {
          // ignore storage write failures
        }

        onDone();
      };

      const onTransitionEnd = (event: TransitionEvent) => {
        if (event.target !== overlayNode) {
          return;
        }

        cleanup();
      };

      overlayNode.addEventListener("transitionend", onTransitionEnd, {
        once: true,
      });

      exitFallbackTimer = window.setTimeout(() => {
        cleanup();
      }, EXIT_TIMEOUT_MS);
    };

    const finishPreloader = () => {
      if (isExiting) {
        return;
      }

      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }

      displayedProgress = 1;
      setProgressText(1, true);
      beginPreloaderExit();
    };

    const easeOutCubic = (value: number) => 1 - (1 - value) ** 3;

    const completionDurationMs = () => {
      if (prefersReducedMotion) {
        return REDUCED_MOTION_COUNTUP_MS;
      }

      const remaining = Math.max(0, 1 - completionFrom);
      return Math.max(240, Math.round(COMPLETION_COUNTUP_MS * (0.35 + remaining * 0.65)));
    };

    const holdDurationMs = prefersReducedMotion ? REDUCED_MOTION_HOLD_MS : HOLD_AT_100_MS;

    const animate = (now: number) => {
      if (isExiting) {
        return;
      }

      if (!isCompleteRef.current) {
        completionStartedAt = null;
        heldAtCompleteSince = null;
        displayedProgress += (actualProgressRef.current - displayedProgress) * PROGRESS_SMOOTHING;
        setProgressText(displayedProgress, false);
        rafId = window.requestAnimationFrame(animate);
        return;
      }

      if (completionStartedAt === null) {
        completionStartedAt = now;
        completionFrom = displayedProgress;
      }

      const countupMs = completionDurationMs();
      const t = countupMs === 0 ? 1 : Math.min(1, (now - completionStartedAt) / countupMs);
      displayedProgress = completionFrom + (1 - completionFrom) * easeOutCubic(t);

      if (t >= 1) {
        displayedProgress = 1;
        setProgressText(1, true);

        if (heldAtCompleteSince === null) {
          heldAtCompleteSince = now;
        }

        if (now - heldAtCompleteSince >= holdDurationMs) {
          finishPreloader();
          return;
        }
      } else {
        setProgressText(displayedProgress, true);
      }

      rafId = window.requestAnimationFrame(animate);
    };

    html.classList.add("is-loading");
    html.classList.remove("is-preloader-exiting");

    setProgressText(0);
    rafId = window.requestAnimationFrame(animate);

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }

      if (exitFallbackTimer !== null) {
        window.clearTimeout(exitFallbackTimer);
      }

      html.classList.remove("is-preloader-exiting");
    };
  }, [actualProgressRef, hasStartedAssetLoading, isCompleteRef, onDone]);

  return (
    <div
      ref={overlayRef}
      className={styles.overlay}
      data-preloader-overlay="true"
      aria-label="Loading portfolio"
    >
      <ASCIIAnimation
        className={`${styles.track} ${isAsciiReady ? styles.trackEntered : ""}`.trim()}
        preClassName={styles.walker}
        frameFolder={frameFolder}
        quality="high"
        frameCount={37}
        fps={20}
        lazy={false}
        scale={ASCII_SCALE}
        onReady={handleAsciiReady}
        ariaLabel="ASCII walking animation"
      />
      <div
        className={`${styles.progress} ${styles.progressVisible}`}
        role="status"
        aria-live="polite"
        aria-label="Loading progress"
      >
        <span ref={progressRef} className={styles.progressValue} data-progress="0">
          0%
        </span>
      </div>
    </div>
  );
}
