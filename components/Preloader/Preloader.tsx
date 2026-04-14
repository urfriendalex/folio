"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ASCIIAnimation from "./ascii";
import { getFrameFolderForTheme, getInitialFrameFolder } from "./frameFolder";
import styles from "./preloader.module.scss";
import {
  CRITICAL_PRELOAD_ASSETS,
  usePreloaderAssets,
} from "./usePreloaderAssets";

type PreloaderProps = {
  onDone: () => void;
};

const PROGRESS_SMOOTHING = 0.08;
const COMPLETION_PROGRESS_SMOOTHING = 0.22;
const EXIT_TIMEOUT_MS = 1200;
const ENTER_DURATION_MS = 320;
const ASCII_SCALE = 1;

export function Preloader({ onDone }: PreloaderProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef<HTMLSpanElement | null>(null);

  const [frameFolder, setFrameFolder] = useState(getInitialFrameFolder);
  const [isAsciiReady, setIsAsciiReady] = useState(false);
  const [hasStartedAssetLoading, setHasStartedAssetLoading] = useState(false);
  const { actualProgressRef, isCompleteRef } = usePreloaderAssets(
    CRITICAL_PRELOAD_ASSETS,
    hasStartedAssetLoading,
  );
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

  useEffect(() => {
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

    const setProgressText = (value: number, isComplete = false) => {
      const clamped = Math.max(0, Math.min(isComplete ? 1 : 0.99, value));
      const percent = isComplete ? 100 : Math.min(99, Math.floor(clamped * 100));
      progressNode.textContent = `${percent}%`;
    };

    if (!hasStartedAssetLoading) {
      html.classList.add("is-loading");
      html.classList.remove("is-preloader-exiting");
      setProgressText(0);
      return;
    }

    const finishPreloader = () => {
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

    const animate = () => {
      if (isExiting) {
        return;
      }

      const smoothing = isCompleteRef.current
        ? COMPLETION_PROGRESS_SMOOTHING
        : PROGRESS_SMOOTHING;
      displayedProgress += (actualProgressRef.current - displayedProgress) * smoothing;

      if (isCompleteRef.current && displayedProgress > 0.995) {
        displayedProgress = 1;
      }

      setProgressText(displayedProgress, isCompleteRef.current && displayedProgress >= 1);

      if (isCompleteRef.current && displayedProgress >= 1) {
        finishPreloader();
        return;
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
        className={`${styles.progress} ${hasStartedAssetLoading ? styles.progressVisible : ""}`.trim()}
        role="status"
        aria-live="polite"
        aria-label="Loading progress"
      >
        <span ref={progressRef} className={styles.progressValue} />
      </div>
    </div>
  );
}
