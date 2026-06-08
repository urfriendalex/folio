"use client";

import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";
import { usePreloaderComplete } from "@/lib/preloaderComplete";

export type UseRevealOnViewOptions = {
  once?: boolean;
  rootMargin?: string;
  threshold?: number;
  /** After intersection, wait before flipping visible. */
  revealDelayMs?: number;
  /** Skip observers when visibility is controlled by a parent. */
  observerDisabled?: boolean;
};

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
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    reducedMotionSnapshot,
    reducedMotionServerSnapshot,
  );

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (options?.observerDisabled || reducedMotion) {
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

    const isNodeInViewport = () => {
      const rect = node.getBoundingClientRect();
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      return rect.bottom > 0 && rect.top < viewportHeight;
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
      {
        rootMargin: options?.rootMargin ?? "0px 0px -10% 0px",
        threshold: options?.threshold ?? 0.2,
      },
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
    reducedMotion,
    options?.observerDisabled,
    options?.once,
    options?.rootMargin,
    options?.threshold,
    options?.revealDelayMs,
    ref,
  ]);

  return reducedMotion || visible;
}
