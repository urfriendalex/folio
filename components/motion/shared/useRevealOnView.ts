"use client";

import { useEffect, useLayoutEffect, useState, useSyncExternalStore, type RefObject } from "react";
import { usePreloaderComplete } from "@/lib/preloaderComplete";
import { useRevealMotionEnabled } from "@/lib/revealPolicy";
import { isAtOrAboveViewportBottom, isRevealRestoreWindow } from "@/lib/revealRestore";

export type UseRevealOnViewOptions = {
  once?: boolean;
  rootMargin?: string;
  threshold?: number;
  /** After intersection, wait before flipping visible. */
  revealDelayMs?: number;
  /** Skip observers when visibility is controlled by a parent. */
  observerDisabled?: boolean;
};

const DEFAULT_ROOT_MARGIN = "0px 0px -10% 0px";
const DEFAULT_THRESHOLD = 0.2;

/** Resolves one CSS rootMargin length (`px` or `%` of the viewport axis) to pixels. */
function resolveMarginPx(value: string | undefined, axisPx: number) {
  if (!value) {
    return 0;
  }
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount)) {
    return 0;
  }
  return value.trim().endsWith("%") ? (amount / 100) * axisPx : amount;
}

/** Top/bottom insets of an IntersectionObserver rootMargin, using CSS shorthand rules. */
function verticalRootMarginPx(rootMargin: string, viewportHeight: number) {
  const parts = rootMargin.trim().split(/\s+/);
  const top = parts[0];
  const bottom = parts[2] ?? top;
  return {
    top: resolveMarginPx(top, viewportHeight),
    bottom: resolveMarginPx(bottom, viewportHeight),
  };
}

function subscribeReducedMotion(onStoreChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function reducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function reducedMotionServerSnapshot() {
  return false;
}

export function useRevealOnView<T extends HTMLElement>(
  ref: RefObject<T | null>,
  options?: UseRevealOnViewOptions,
) {
  const preloaderComplete = usePreloaderComplete();
  const revealMotionEnabled = useRevealMotionEnabled();
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    reducedMotionSnapshot,
    reducedMotionServerSnapshot,
  );

  const [visible, setVisible] = useState(false);

  /* Restore (reload / back-forward): decide before the first post-hydration paint. Otherwise content
     already on screen (server-rendered, visible) would hide when reveals enable and pop back a beat later. */
  const [restoredSeen, setRestoredSeen] = useState(false);
  useLayoutEffect(() => {
    const node = ref.current;
    if (node && isRevealRestoreWindow() && isAtOrAboveViewportBottom(node)) {
      // Ref is only available after commit; this has to land before the first paint.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- DOM measurement, not derived state
      setRestoredSeen(true);
    }
  }, [ref]);

  useEffect(() => {
    if (options?.observerDisabled || reducedMotion || !revealMotionEnabled) {
      return undefined;
    }

    const node = ref.current;

    if (!node) {
      return undefined;
    }

    if (!preloaderComplete) {
      return undefined;
    }

    let revealTimerId: number | undefined;
    let frameId: number | undefined;
    let revealed = false;

    const clearRevealTimer = () => {
      if (revealTimerId !== undefined) {
        window.clearTimeout(revealTimerId);
        revealTimerId = undefined;
      }
    };

    const cleanupPassiveChecks = () => {
      window.removeEventListener("scroll", scheduleViewportCheck, { capture: true });
      window.removeEventListener("resize", scheduleViewportCheck);
      window.removeEventListener("hashchange", scheduleViewportCheck);
      window.removeEventListener("folio:home-section-arrive", scheduleViewportCheck);

      if (frameId !== undefined) {
        window.cancelAnimationFrame(frameId);
        frameId = undefined;
      }
    };

    const finish = () => {
      revealTimerId = undefined;
      revealed = true;
      setVisible(true);

      if (options?.once !== false) {
        observer.disconnect();
        cleanupPassiveChecks();
      }
    };

    const reveal = () => {
      if (revealed || revealTimerId !== undefined) {
        return;
      }

      const delayMs = options?.revealDelayMs ?? 0;

      if (delayMs <= 0) {
        finish();
        return;
      }

      revealTimerId = window.setTimeout(finish, delayMs);
    };

    const rootMargin = options?.rootMargin ?? DEFAULT_ROOT_MARGIN;
    const threshold = options?.threshold ?? DEFAULT_THRESHOLD;

    /* Scroll fallback must agree with the observer's rootMargin + threshold, or it reveals off-screen first. */
    const isNodeInViewport = () => {
      if (isRevealRestoreWindow()) {
        return isAtOrAboveViewportBottom(node);
      }

      const rect = node.getBoundingClientRect();
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const margin = verticalRootMarginPx(rootMargin, viewportHeight);
      const visibleTop = Math.max(rect.top, -margin.top);
      const visibleBottom = Math.min(rect.bottom, viewportHeight + margin.bottom);
      const visibleHeight = visibleBottom - visibleTop;

      if (visibleHeight <= 0) {
        return false;
      }

      return threshold <= 0 || rect.height <= 0 || visibleHeight / rect.height >= threshold;
    };

    function scheduleViewportCheck() {
      if (revealed || frameId !== undefined) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = undefined;

        if (isNodeInViewport()) {
          reveal();
        }
      });
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) {
          return;
        }

        reveal();
      },
      { rootMargin, threshold },
    );

    observer.observe(node);
    window.addEventListener("scroll", scheduleViewportCheck, { capture: true, passive: true });
    window.addEventListener("resize", scheduleViewportCheck, { passive: true });
    window.addEventListener("hashchange", scheduleViewportCheck);
    window.addEventListener("folio:home-section-arrive", scheduleViewportCheck);
    scheduleViewportCheck();

    return () => {
      clearRevealTimer();
      cleanupPassiveChecks();

      observer.disconnect();
    };
  }, [
    preloaderComplete,
    revealMotionEnabled,
    reducedMotion,
    options?.observerDisabled,
    options?.once,
    options?.rootMargin,
    options?.threshold,
    options?.revealDelayMs,
    ref,
  ]);

  return reducedMotion || !revealMotionEnabled || visible || restoredSeen;
}
